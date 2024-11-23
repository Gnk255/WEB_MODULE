require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Admin = require('./models/Admin');
const Student = require('./models/Student');
const app = express();

// Підключення до бази даних MongoDB Atlas
const mongoURI = 'mongodb+srv://vadimgolubenko777:bSEnBXrfh6KiJ3Wb@ecsdb.576vw.mongodb.net/?retryWrites=true&w=majority&appName=ECSDB';

mongoose.connect(mongoURI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch(err => console.error('MongoDB connection error:', err));

// Налаштування EJS
app.set('view engine', 'ejs');
app.set('views', './views');

// Middleware для обробки POST-запитів
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Перша сторінка: реєстрація
app.get('/', (req, res) => {
  res.redirect('/register');
});

// Список доступних предметів для вибору студентами
const availableSubjects = [
    'Математика',
    'Фізика',
    'Хімія',
    'Історія',
    'Література',
    'Програмування'
  ];
  
  // Маршрут для реєстрації адміністратора та студента
  app.get('/register', (req, res) => {
    res.render('register', { error: null, availableSubjects });
  });
  
  app.post('/register', async (req, res) => {
    const { username, password, role, firstName, lastName, subjects } = req.body;
  
    try {
      if (role === 'admin') {
        // Перевіряємо, чи вже існує адміністратор з таким ім'ям
        const existingAdmin = await Admin.findOne({ username });
        if (existingAdmin) {
          return res.render('register', { error: 'Ім\'я користувача вже використовується', availableSubjects });
        }
  
        // Хешуємо пароль адміністратора
        const hashedPassword = await bcrypt.hash(password, 10);
  
        // Створюємо нового адміністратора
        const newAdmin = new Admin({ username, password: hashedPassword });
  
        // Зберігаємо адміністратора в базу даних
        await newAdmin.save();
  
        // Перенаправляємо на сторінку логіну після успішної реєстрації
        return res.redirect('/index');
      } else if (role === 'student') {
        // Перевіряємо, чи вже існує студент з таким ім'ям
        const existingStudent = await Student.findOne({ username });
        if (existingStudent) {
          return res.render('index', { error: 'Ім\'я користувача вже використовується', availableSubjects });
        }
  
        // Хешуємо пароль студента
        const hashedPassword = await bcrypt.hash(password, 10);
        const subjectsArray = Array.isArray(subjects) ? subjects : [subjects];
  
        // Створюємо нового студента
        const newStudent = new Student({
          username,
          password: hashedPassword,
          firstName,
          lastName,
          subjects: subjectsArray.map(subject => ({ subjectName: subject, grades: [] })),
        });
  
        // Зберігаємо студента в базу даних
        await newStudent.save();
  
        // Перенаправляємо на сторінку логіну після успішної реєстрації
        return res.redirect('/login');
      } else {
        res.render('register', { error: 'Невідома роль', availableSubjects });
      }
    } catch (err) {
      console.error('Failed to register user:', err);
      res.status(500).send('Server error');
    }
  });
  
  
  
// Маршрут для логіну адміністратора та студента
// Маршрут для логіну адміністратора та студента
app.get('/login', (req, res) => {
    res.render('login', { error: null });
  });
  
  // Маршрут для логіну
app.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  try {
    if (role === 'admin') {
      const admin = await Admin.findOne({ username });
      if (admin && await bcrypt.compare(password, admin.password)) {
        // Перенаправляємо на головну сторінку після успішного логіну адміністратора
        return res.redirect(`/index?role=admin&username=${username}`);
      }
    } else if (role === 'student') {
      const student = await Student.findOne({ username });
      if (student && await bcrypt.compare(password, student.password)) {
        // Перенаправляємо на головну сторінку після успішного логіну студента
        return res.redirect(`/?role=student&username=${username}`);
      }
    }
    // Якщо дані неправильні, повертаємо сторінку з повідомленням про помилку
    res.render('login', { error: 'Неправильне ім\'я користувача або пароль' });
  } catch (err) {
    console.error('Failed to login:', err);
    res.status(500).send('Server error');
  }
});

// Маршрут для реєстрації
app.post('/register', async (req, res) => {
  const { username, password, role, firstName, lastName, subjects } = req.body;

  try {
    if (role === 'admin') {
      const existingAdmin = await Admin.findOne({ username });
      if (existingAdmin) {
        return res.render('register', { error: 'Ім\'я користувача вже використовується', availableSubjects });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newAdmin = new Admin({ username, password: hashedPassword });
      await newAdmin.save();

      // Перенаправляємо на головну сторінку після успішної реєстрації адміністратора
      return res.redirect(`/?role=admin&username=${username}`);
    } else if (role === 'student') {
      const existingStudent = await Student.findOne({ username });
      if (existingStudent) {
        return res.render('register', { error: 'Ім\'я користувача вже використовується', availableSubjects });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const subjectsArray = Array.isArray(subjects) ? subjects : [subjects];
      const newStudent = new Student({
        username,
        password: hashedPassword,
        firstName,
        lastName,
        subjects: subjectsArray.map(subject => ({ subjectName: subject, grades: [] })),
      });
      await newStudent.save();

      // Перенаправляємо на головну сторінку після успішної реєстрації студента
      return res.redirect(`/?role=student&username=${username}`);
    } else {
      res.render('register', { error: 'Невідома роль', availableSubjects });
    }
  } catch (err) {
    console.error('Failed to register user:', err);
    res.status(500).send('Server error');
  }
});

// Головна сторінка
app.get('/', (req, res) => {
  const { role, username } = req.query;

  if (!role || !username) {
    return res.redirect('/login');
  }

  // Рендеримо головну сторінку з відповідними параметрами ролі та іменем користувача
  res.render('index', { role, username });
});

async function getAllStudents() {
  try {
    const students = await Student.find(); // Используем find() без параметров, чтобы получить всех студентов
    return students; // Возвращаем массив студентов
  } catch (error) {
    console.error('Ошибка при получении студентов:', error);
    throw error; // Генерируем ошибку, чтобы функция вернула её в случае неудачи
  }
}

app.get('/index', async (req, res) => {
  const { role, username } = req.query;

  try {
    // Перевірка наявності параметрів 'role' та 'username'
    if (!role || !username) {
      // Якщо параметри відсутні, перенаправляємо на сторінку логіну
      return res.redirect('/login');
    }
    const students = await getAllStudents();
    // Рендеримо головну сторінку з переданими параметрами 'role' та 'username'
    res.render('index', { role, username, students});
  } catch (err) {
    console.error('Failed to load index page:', err);
    res.status(500).send('Server error');
  }
});

const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
