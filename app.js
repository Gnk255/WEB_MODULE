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
  
// Маршрут для студентського профілю
app.get('/student', async (req, res) => {
  const { username } = req.query;

  try {
    // Знаходимо студента за іменем користувача
    const student = await Student.findOne({ username });
    if (student) {
      // Якщо студент знайдений, рендеримо сторінку студента
      res.render('student', { student });
    } else {
      res.status(404).send('Студент не знайдений');
    }
  } catch (err) {
    console.error('Failed to load student page:', err);
    res.status(500).send('Server error');
  }
});


  // Маршрут для реєстрації адміністратора та студента
app.get('/register', (req, res) => {
  res.render('register', { error: null }); // Удален параметр availableSubjects
});

app.post('/register', async (req, res) => {
  const { username, password, role, firstName, lastName } = req.body;

  try {
    if (role === 'admin') {
      // Проверяем, существует ли администратор с таким именем пользователя
      const existingAdmin = await Admin.findOne({ username });
      if (existingAdmin) {
        return res.render('register', { error: 'Ім\'я користувача вже використовується' });
      }

      // Хешируем пароль администратора
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создаем нового администратора
      const newAdmin = new Admin({ 
        username, 
        password: hashedPassword 
      });

      // Сохраняем администратора в базе данных
      await newAdmin.save();

      // Перенаправляем на страницу логина после успешной регистрации
      return res.redirect('/index');
    } else if (role === 'student') {
      // Проверяем, существует ли студент с таким именем пользователя
      const existingStudent = await Student.findOne({ username });
      if (existingStudent) {
        return res.render('register', { error: 'Ім\'я користувача вже використовується' });
      }

      // Хешируем пароль студента
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создаем нового студента с пустым полем subject
      const newStudent = new Student({
        username,
        password: hashedPassword,
        firstName,
        lastName,
        subject: { subjectName: '', grade: null } // Добавляем пустое поле subject
      });

      // Сохраняем студента в базе данных
      await newStudent.save();

      // Перенаправляем на страницу логина после успешной регистрации
      return res.redirect('/login');
    } else {
      res.render('register', { error: 'Невідома роль' });
    }
  } catch (err) {
    console.error('Failed to register user:', err);
    res.status(500).send('Server error');
  }
});

// Маршрут для логіну адміністратора та студента
app.get('/login', (req, res) => {
    res.render('login', { error: null });
  });
  
  // Маршрут для логіну
app.post('/login', async (req, res) => {
  const { username, password, role } = req.body;

  console.log('Вход пользователя:', username, 'с ролью:', role);

  try {
    if (role === 'admin') {
      const admin = await Admin.findOne({ username });
      if (admin && await bcrypt.compare(password, admin.password)) {
        console.log('Админ найден');
        return res.redirect(`/index?role=admin&username=${username}`);
      }
    } else if (role === 'student') {
      const student = await Student.findOne({ username });
      if (student && await bcrypt.compare(password, student.password)) {
        console.log('Студент найден');
        return res.redirect(`/student?role=student&username=${username}`);
      }
    }
    console.log('Неправильное имя пользователя или пароль');
    res.render('login', { error: 'Неправильне ім\'я користувача або пароль' });
  } catch (err) {
    console.error('Ошибка при входе:', err);
    res.status(500).send('Ошибка сервера');
  }
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

app.post('/delete-subject/:id', async (req, res) => {
  const { role, username } = req.query; // Извлекаем параметры из URL
  try {
    // Устанавливаем поле subject в пустое значение
    await Student.updateOne(
      { _id: req.params.id },
      { $set: { subject: { subjectName: '', grade: null } } }
    );

    // Перенаправляем обратно на страницу index с параметрами role и username
    res.redirect(`/index?role=${role}&username=${username}`);
  } catch (error) {
    console.error('Ошибка при удалении предмета:', error);
    res.status(500).send('Ошибка при удалении предмета');
  }
});


app.post('/add-grade/:id', async (req, res) => {
  const { role, username } = req.query; // Извлекаем параметры из URL
  try {
    let { subjectName, grade } = req.body;

    // Преобразуем строку в число
    grade = Number(grade);

    // Проверка, что оценка не превышает 100
    if (grade > 100) {
      return res.status(400).send('Оцінка не може перевищувати 100');
    }

    await Student.updateOne(
      { _id: req.params.id },
      { $set: { subject: { subjectName: subjectName, grade: grade } } }
    );

    // Перенаправляем обратно на страницу index с параметрами role и username
    res.redirect(`/index?role=${role}&username=${username}`);
  } catch (error) {
    console.error('Ошибка при добавлении оценки:', error);
    res.status(500).send('Ошибка при добавлении оценки');
  }
});



app.post('/delete-student/:id', async (req, res) => {
  const { role, username } = req.query;
  try {
    await Student.findByIdAndDelete(req.params.id);
    res.redirect(`/index?role=${role}&username=${username}`);
  } catch (error) {
    console.error('Ошибка при удалении студента:', error);
    res.status(500).send('Ошибка при удалении студента');
  }
});


const PORT = process.env.PORT || 3030;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
