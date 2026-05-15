import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Monument from '../models/Monument.js';
import ModelVersion from '../models/ModelVersion.js';
import { buildPublicS3Url, resolveS3Key } from '../services/s3Service.js';

dotenv.config();

const DEFAULT_UPLOADED_BY = process.env.MIGRATION_USER_ID || null;

function extractFilename(value) {
	if (!value) return null;

	const s3Key = resolveS3Key(value);
	if (s3Key) {
		return s3Key.split('/').pop();
	}

	try {
		const urlParts = value.split('/');
		const filename = urlParts[urlParts.length - 1];
		return filename.split('?')[0] || null;
	} catch {
		return null;
	}
}

async function migrateS3Structure() {
	if (!process.env.MONGODB_URI) {
		throw new Error('MONGODB_URI environment variable is required');
	}

	await mongoose.connect(process.env.MONGODB_URI);
	console.log('✓ Connected to MongoDB');

	try {
		const monuments = await Monument.find({ model3DUrl: { $exists: true, $ne: null, $ne: '' } }).populate('createdBy');
		console.log(`\nFound ${monuments.length} monuments with 3D models\n`);

		let migrated = 0;
		let skipped = 0;
		let errors = 0;

		for (const monument of monuments) {
			try {
				const alreadyStructured = monument.s3ModelFileName && monument.model3DUrl?.includes('/models/monuments/');
				if (alreadyStructured) {
					skipped++;
					console.log(`⊘ Skipped (already structured): ${monument.name}`);
					continue;
				}

				const originalFilename = extractFilename(monument.model3DUrl);
				if (!originalFilename) {
					skipped++;
					console.log(`⚠ Skipped (filename not detected): ${monument.name}`);
					continue;
				}

				const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
				const sanitizedFilename = originalFilename.replace(/[^a-zA-Z0-9.-]/g, '_');
				const key = `models/monuments/${monument._id}/${timestamp}_${sanitizedFilename}`;
				const url = buildPublicS3Url(key);

				const uploadedBy = monument.createdBy?._id || monument.createdBy || DEFAULT_UPLOADED_BY;
				if (uploadedBy) {
					const existingVersion = await ModelVersion.findOne({ monumentId: monument._id, s3Key: key });
					if (!existingVersion) {
						await ModelVersion.create({
							monumentId: monument._id,
							filename: key,
							url,
							s3Key: key,
							uploadedBy,
							isActive: true,
							fileSize: 0,
							tilesUrl: monument.model3DTilesUrl || undefined,
						});
					}
				}

				await Monument.findByIdAndUpdate(monument._id, {
					model3DUrl: url,
					s3ModelKey: key,
					s3ModelFileName: key,
				});

				migrated++;
				console.log(`✓ Migrated: ${monument.name}`);
			} catch (error) {
				errors++;
				console.error(`✗ Error migrating ${monument.name}:`, error.message);
			}
		}

		console.log(`\n✓ Migration completed:`);
		console.log(`  - ${migrated} monuments migrated`);
		console.log(`  - ${skipped} monuments skipped`);
		console.log(`  - ${errors} errors\n`);

		return { success: errors === 0, migrated, skipped, errors };
	} finally {
		await mongoose.connection.close();
		console.log('✓ Connection closed');
	}
}

async function rollbackMigration() {
	await mongoose.connect(process.env.MONGODB_URI);
	console.log('✓ Connected to MongoDB');
	console.log('\n⚠️  ROLLBACK MODE - This reverts the S3 structure migration\n');

	try {
		const modelVersions = await ModelVersion.find({ s3Key: { $regex: /^models\/monuments\// } });
		console.log(`Found ${modelVersions.length} model version records\n`);

		for (const version of modelVersions) {
			await ModelVersion.findByIdAndDelete(version._id);
			await Monument.findByIdAndUpdate(version.monumentId, {
				model3DUrl: null,
				s3ModelKey: null,
				s3ModelFileName: null,
			});
		}

		console.log('✓ Rollback completed');
	} finally {
		await mongoose.connection.close();
		console.log('✓ Connection closed');
	}
}

const args = process.argv.slice(2);
if (args.includes('--rollback')) {
	rollbackMigration().catch((error) => {
		console.error('✗ Rollback failed:', error);
		process.exit(1);
	});
} else {
	migrateS3Structure().catch((error) => {
		console.error('✗ Migration failed:', error);
		process.exit(1);
	});
}

export { migrateS3Structure, rollbackMigration };