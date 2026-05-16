import mongoose from 'mongoose';
import Quiz from '../models/Quiz.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Migración: Convertir estructura de Quiz de formato antiguo a nuevo
 * 
 * Formato antiguo: { question, options[], correctAnswer }
 * Formato nuevo: { questionText, options: [{text, isCorrect}], explanation }
 */
async function migrateQuizStructure() {
  try {
    // Conectar a MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Conectado a MongoDB');

    // Buscar todos los quizzes
    const quizzes = await Quiz.find();
    console.log(`\nEncontrados ${quizzes.length} quizzes para migrar\n`);

    let migrated = 0;
    let skipped = 0;

    for (const quiz of quizzes) {
      let needsMigration = false;

      // Verificar si necesita migración
      for (const question of quiz.questions) {
        if (question.question && !question.questionText) {
          needsMigration = true;
          break;
        }
      }

      if (!needsMigration) {
        console.log(`⊘ Saltado (ya migrado): ${quiz.title}`);
        skipped++;
        continue;
      }

      // Migrar estructura de preguntas
      quiz.questions = quiz.questions.map(q => {
        // Si ya tiene el nuevo formato, mantenerlo
        if (q.questionText) {
          return q;
        }

        // Convertir de formato antiguo a nuevo
        const newQuestion = {
          questionText: q.question || q.questionText,
          options: [],
          explanation: q.explanation || ''
        };

        // Convertir opciones
        if (Array.isArray(q.options)) {
          newQuestion.options = q.options.map((opt, idx) => {
            // Si la opción ya es un objeto con text e isCorrect
            if (typeof opt === 'object' && opt.text !== undefined) {
              return opt;
            }
            
            // Si la opción es un string, convertirla
            return {
              text: typeof opt === 'string' ? opt : String(opt),
              isCorrect: idx === q.correctAnswer
            };
          });
        }

        return newQuestion;
      });

      // Guardar quiz migrado
      await quiz.save();
      migrated++;
      console.log(`✓ Migrado: ${quiz.title} (${quiz.questions.length} preguntas)`);
    }

    console.log(`\n✓ Migración completada:`);
    console.log(`  - ${migrated} quizzes migrados`);
    console.log(`  - ${skipped} quizzes ya estaban en nuevo formato\n`);

    // Validar integridad
    console.log('Validando integridad de datos...');
    const allQuizzes = await Quiz.find();
    let validationErrors = 0;

    for (const quiz of allQuizzes) {
      for (const question of quiz.questions) {
        if (!question.questionText) {
          console.error(`✗ Error: Quiz "${quiz.title}" tiene pregunta sin questionText`);
          validationErrors++;
        }
        
        const correctCount = question.options.filter(opt => opt.isCorrect).length;
        if (correctCount !== 1) {
          console.error(`✗ Error: Quiz "${quiz.title}" tiene pregunta con ${correctCount} respuestas correctas (debe ser 1)`);
          validationErrors++;
        }
      }
    }

    if (validationErrors === 0) {
      console.log('✓ Validación exitosa: todos los quizzes tienen estructura correcta\n');
    } else {
      console.error(`\n✗ Se encontraron ${validationErrors} errores de validación\n`);
    }

  } catch (error) {
    console.error('✗ Error en migración:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('✓ Conexión cerrada');
  }
}

// Ejecutar migración
migrateQuizStructure();
