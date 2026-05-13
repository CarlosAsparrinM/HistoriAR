import mongoose from 'mongoose';
import Monument from '../models/Monument.js';
import Institution from '../models/Institution.js';
import Category from '../models/Category.js';
import { config } from 'dotenv';

config();

const S3_BUCKET = process.env.S3_BUCKET || 'historiar-storage-prod';
const AWS_REGION = process.env.AWS_REGION || 'us-east-1';

const buildS3Url = (key) => `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`;

async function seedMonuments() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        // Get institutions and categories to reference
        const institutions = await Institution.find({});
        const categories = await Category.find({});
        
        const museumLarco = institutions.find(i => i.name.includes('Larco'));
        const municipalidadMiraflores = institutions.find(i => i.name.includes('Miraflores'));
        const unmsm = institutions.find(i => i.name.includes('San Marcos'));
        
        const arqueologico = categories.find(c => c.name === 'Arqueológico');
        const colonial = categories.find(c => c.name === 'Colonial');
        const republicano = categories.find(c => c.name === 'Republicano');

        const sampleMonuments = [
            {
                name: 'Huaca Pucllana',
                description: 'Sitio arqueológico preincaico de la cultura Lima, construido entre los años 200 y 700 d.C. Es una pirámide trunca de adobe y barro.',
                categoryId: arqueologico?._id,
                location: {
                    lat: -12.1067,
                    lng: -77.0347,
                    address: 'Calle General Borgoño cuadra 8, Miraflores',
                    district: 'Miraflores'
                },
                period: {
                    name: 'Intermedio Temprano',
                    startYear: 200,
                    endYear: 700
                },
                culture: 'Lima',
                imageUrl: buildS3Url('images/huaca-pucllana.jpg'),
                model3DUrl: buildS3Url('models/huaca-pucllana.glb'),
                institutionId: municipalidadMiraflores?._id,
                status: 'Disponible'
            },
            {
                name: 'Huaca Huallamarca',
                description: 'También conocida como Pan de Azúcar, es una huaca de la cultura Lima ubicada en San Isidro.',
                categoryId: arqueologico?._id,
                location: {
                    lat: -12.0964,
                    lng: -77.0428,
                    address: 'Av. El Rosario 194, San Isidro',
                    district: 'San Isidro'
                },
                period: {
                    name: 'Intermedio Temprano',
                    startYear: 200,
                    endYear: 700
                },
                culture: 'Lima',
                imageUrl: buildS3Url('images/huaca-huallamarca.jpg'),
                institutionId: unmsm?._id,
                status: 'Disponible'
            },
            {
                name: 'Casa de Aliaga',
                description: 'Casa colonial del siglo XVI que ha permanecido en la misma familia durante 17 generaciones.',
                categoryId: colonial?._id,
                location: {
                    lat: -12.0464,
                    lng: -77.0282,
                    address: 'Jr. de la Unión 224, Lima',
                    district: 'Lima Centro'
                },
                period: {
                    name: 'Virreinato',
                    startYear: 1535,
                    endYear: 1821
                },
                culture: 'Colonial Española',
                imageUrl: buildS3Url('images/casa-aliaga.jpg'),
                model3DUrl: buildS3Url('models/casa-aliaga.gltf'),
                status: 'Disponible'
            },
            {
                name: 'Palacio de Torre Tagle',
                description: 'Palacio limeño del siglo XVIII, ejemplo de la arquitectura colonial tardía.',
                categoryId: colonial?._id,
                location: {
                    lat: -12.0433,
                    lng: -77.0323,
                    address: 'Jr. Ucayali 363, Lima',
                    district: 'Lima Centro'
                },
                period: {
                    name: 'Virreinato Tardío',
                    startYear: 1715,
                    endYear: 1821
                },
                culture: 'Colonial Española',
                imageUrl: buildS3Url('images/torre-tagle.jpg'),
                status: 'Disponible'
            },
            {
                name: 'Estación de Desamparados',
                description: 'Antigua estación de ferrocarril construida en 1912, ejemplo de arquitectura republicana.',
                categoryId: republicano?._id,
                location: {
                    lat: -12.0431,
                    lng: -77.0282,
                    address: 'Jr. Ancash 201, Lima',
                    district: 'Lima Centro'
                },
                period: {
                    name: 'República Aristocrática',
                    startYear: 1912,
                    endYear: 1930
                },
                culture: 'Republicana',
                imageUrl: buildS3Url('images/desamparados.jpg'),
                status: 'Oculto'
            }
        ];

        // Clear existing monuments
        await Monument.deleteMany({});
        console.log('Cleared existing monuments');

        // Create sample monuments
        const monuments = await Monument.insertMany(sampleMonuments);
        console.log(`Created ${monuments.length} monuments:`);

        monuments.forEach(monument => {
            const category = categories.find(c => c._id.equals(monument.categoryId));
            console.log(`- ${monument.name} (${category?.name || 'Sin categoría'}) - ${monument.status}`);
        });

    } catch (error) {
        console.error('Error seeding monuments:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

seedMonuments();