const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
// const authRoutes = require('./routes/auth');
// const vaccinationRoutes = require('./routes/vaccination');
// const centerRoutes = require('./routes/centers');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');


// const app = express();
// const port = 3000;
//
// // Set up Mongoose connection
// mongoose
//   .connect('mongodb://localhost:27017/vaccinationApp', { useNewUrlParser: true, useUnifiedTopology: true })
//   .then(() => {
//     console.log('Connected to MongoDB');
//     app.listen(port, () => {
//       console.log(`Server running on port ${port}`);
//     });
//   })
//   .catch((error) => {
//     console.error('Failed to connect to MongoDB', error);
//   });
//
// // Set up session store
// const store = new MongoDBStore({
//   uri: 'mongodb://localhost:27017/vaccinationApp',
//   collection: 'sessions',
// });
//
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(
//   session({
//     secret: 'secret-key',
//     resave: false,
//     saveUninitialized: false,
//     store,
//   })
// );
//
// // Mount the routes
// app.use('/api/auth', authRoutes);
// app.use('/api/vaccination', vaccinationRoutes);
// app.use('/api/admin', centerRoutes);
//
// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ message: 'Something went wrong' });
// });









// Create an instance of Express
const app = express();
// const app = express.Router()
// Set up middleware
app.use(bodyParser.json());
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));

const saltRounds = 10;
const salt = bcrypt.genSaltSync(saltRounds);

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false
}))

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/covid_vaccination', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => console.error('Failed to connect to MongoDB', error));

// User Routes

// User login route
const userSchema = new mongoose.Schema({
  name: {
  type: String,
  required: true,
},
email: {
  type: String,
  required: true,
  unique: true,
  validate: {
    validator: function (value) {
      // Simple email validation using regex
      return /\S+@\S+\.\S+/.test(value);
    },
    message: 'Invalid email format',
  },
},
password: {
  type: String,
  required: true,
},
});



const User = mongoose.model('User', userSchema);

const vaccinationCenterSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  workingHours: { type: String, required: true },
  availableSlots: { type: Number, default: 0 },
});

const VaccinationCenter = mongoose.model('VaccinationCenter', vaccinationCenterSchema);



app.get('/', (req, res) => {
  res.sendFile(__dirname+"/index.html")
})

app.get('/login', (req, res) => {
  res.sendFile(__dirname+"/signin.html")
})







app.post('/login', async(req, res) => {

  const { email, password } = req.body;

  try {
    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Store user information in session
    req.session.user = user;

    res.status(200).json({ message: 'Login successful' });
  } catch (error) {
    console.error('Failed to login', error);
    res.status(500).json({ message: 'Failed to login' });
  }
});

// User signup route
app.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.send(`<script>alert('Email already exists');window.location.href = '/';</script>`);
    }
    console.log(password);
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });
    await newUser.save();

    res.send(`<script>alert('Signup successful'); window.location.href = '/login';</script>`);
  } catch (error) {
    console.log(error);
    res.send(`<script>alert('Server error');window.location.href = '/'</script>`);
  }
});
















// User search vaccination centers route
app.get('/api/user/vaccination/centers',async(req, res) => {
  try {
    // Fetch all vaccination centers
    const centers = await VaccinationCenter.find();

    res.status(200).json(centers);
  } catch (error) {
    console.error('Failed to fetch vaccination centers', error);
    res.status(500).json({ message: 'Failed to fetch vaccination centers' });
  }
});

// User apply for vaccination slot route
app.post('/api/user/vaccination/bookSlot', async(req, res) => {
  const { centerId } = req.body;

  try {
    // Find the vaccination center
    const center = await VaccinationCenter.findById(centerId);
    if (!center) {
      return res.status(404).json({ message: 'Vaccination center not found' });
    }

    // Check if the center has available slots
    if (center.availableSlots < 10) {
      // Reduce the available slots count by 1
      center.availableSlots += 1;
      await center.save();

      res.status(200).json({ message: 'Vaccination slot booked successfully' });
    } else {
      res.status(400).json({ message: 'No available slots for this vaccination center' });
    }
  } catch (error) {
    console.error('Failed to book vaccination slot', error);
    res.status(500).json({ message: 'Failed to book vaccination slot' });
  }
});

// User logout route
app.post('/api/user/logout', async(req, res) => {
  req.session.destroy();
  res.status(200).json({ message: 'Logout successful' });
});

// Admin Routes

// Admin login route
app.post('/api/admin/login', async(req, res) => {
  const { email, password } = req.body;

  try {
    // Find the admin user by email
    const admin = await User.findOne({ email });
    if (!admin || !admin.isAdmin) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Store admin information in session
    req.session.admin = admin;

    res.status(200).json({ message: 'Admin login successful' });
  } catch (error) {
    console.error('Failed to login as admin', error);
    res.status(500).json({ message: 'Failed to login as admin' });
  }
});

// Admin add vaccination center route
app.post('/api/admin/vaccination/addCenter', async(req, res) => {
  const { name, location, workingHours } = req.body;

  try {
    // Create a new vaccination center
    const newCenter = new VaccinationCenter({ name, location, workingHours });
    await newCenter.save();

    res.status(201).json({ message: 'Vaccination center added successfully' });
  } catch (error) {
    console.error('Failed to add vaccination center', error);
    res.status(500).json({ message: 'Failed to add vaccination center' });
  }
});

// Admin get dosage details grouped by centers route
app.get('/api/admin/vaccination/dosageDetails', async(req, res) => {
  const { id } = req.params;

  try {
    // Find the vaccination center and remove it
    const deletedCenter = await VaccinationCenter.findByIdAndRemove(id);
    if (!deletedCenter) {
      return res.status(404).json({ message: 'Vaccination center not found' });
    }

    res.status(200).json({ message: 'Vaccination center removed successfully' });
  } catch (error) {
    console.error('Failed to remove vaccination center', error);
    res.status(500).json({ message: 'Failed to remove vaccination center' });
  }
});

// Admin remove vaccination center route
app.delete('/api/admin/vaccination/removeCenter/:centerId', async(req, res) => {
  const { id } = req.params;

  try {
    // Find the vaccination center and remove it
    const deletedCenter = await VaccinationCenter.findByIdAndRemove(id);
    if (!deletedCenter) {
      return res.status(404).json({ message: 'Vaccination center not found' });
    }

    res.status(200).json({ message: 'Vaccination center removed successfully' });
  } catch (error) {
    console.error('Failed to remove vaccination center', error);
    res.status(500).json({ message: 'Failed to remove vaccination center' });
  }
});

// Start the server
const port = 4000;
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
