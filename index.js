const express = require("express")
var app = express()
app.get("/", function (request, response) {
    response.send("Hello World!")
})
const bodyParser = require('body-parser');

const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');

var mysql = require('mysql');
const cors = require('cors');

app.use(bodyParser.json());
app.use(cors());

var con = mysql.createConnection({
    host: "x23318597-instance-1.chwlezgyi7rm.eu-west-1.rds.amazonaws.com",
    port: 3306,
    user: "admin",
    password: "Mitesh177",
});

con.connect(function (err) {
    if (err) {
        console.log(err.message)
        throw err
    }
    console.log("Connected!");
    con.query("CREATE DATABASE mitesh", function (err, result) {
        if (err) { console.log(err.message) }
        console.log("Database created");
        return;
    });
    con.query("use mitesh", function (err, result) {
        if (err) {
            console.log(err);
        }
        console.log("database connected successfully");
    })

    const createTableQuery = `
            CREATE TABLE student (student_id INT PRIMARY KEY AUTO_INCREMENT,first_name VARCHAR(50) NOT NULL,last_name VARCHAR(50) NOT NULL,date_of_birth DATE NOT NULL,gender CHAR(1),email VARCHAR(100) UNIQUE,
            phone_number VARCHAR(15),
            address VARCHAR(255),
            enrollment_date DATE,
            course VARCHAR(100)
            );
        `;

    con.query(createTableQuery, (err, results) => {
        if (err) {
            console.error('Error creating the student table:', err);
        }
        console.log('Student table created successfully');
    });
});

app.get('/api/student', (req, res) => {
    const page = parseInt(req.query.page) || 1; // Get page number from query
    const pageSize = parseInt(req.query.pageSize) || 10; // Get page size from query
    const offset = (page - 1) * pageSize; // Calculate offset for pagination

    const readQuery = `SELECT * FROM student LIMIT ? OFFSET ?`; // Adjusted query for pagination
    con.query(readQuery, [pageSize, offset], (err, results) => {
        if (err) {
            console.error('Error fetching student data:', err);
            res.status(500).json({ error: `Failed to fetch student data: ${err.message}` });
            return;
        }

        // Get the total count of students
        const countQuery = `SELECT COUNT(*) as total FROM student`;
        con.query(countQuery, (err, countResults) => {
            if (err) {
                console.error('Error fetching total count of students:', err);
                res.status(500).json({ error: `Failed to retrieve student count: ${err.message}` });
                return;
            }

            // Assuming countResults[0].total will have the count
            res.status(200).json({ results, totalCount: countResults[0].total });
        });
    });
});

app.get('/api/student/:id', (req, res) => {
    const student_id = req.params.id
    const readQuery = `select * from student where student_id=${student_id}`
    con.query(readQuery, (err, results) => {
        if (err) {
            console.error('Error updating student data:', err);
            res.status(500).json({ error: `Failed to update student data ${err.message}` });
            return;
        }

        console.log("Results", results);

        res.status(200).json({ results });

    })
})

app.delete('/api/student/:id', (req, res) => {
    const student_id = req.params.id
    const readQuery = `delete from student where student_id=${student_id}`
    con.query(readQuery, (err, results) => {
        if (err) {
            console.error('Error updating student data:', err);
            res.status(500).json({ error: `Failed ${err.message}` });
            return;
        }

        console.log("Results", results);

        res.status(200).json({ results });

    })
})

app.get('/export-csv', (req, res) => {
    const query = 'SELECT * FROM student';

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Error fetching data');
            return;
        }

        if (results.length === 0) {
            res.status(404).send('No data available to export');
            return;
        }
        const outputPath = path.join(__dirname, 'output.csv');
        const csvWriter = createObjectCsvWriter({
            path: outputPath,
            header: [
                { id: 'student_id', title: 'Student ID' },
                { id: 'first_name', title: 'First Name' },
                { id: 'last_name', title: 'Last Name' },
                { id: 'date_of_birth', title: 'Date Of Birth' },
                { id: 'gender', title: 'Gender' },
                { id: 'email', title: 'Email' },
                { id: 'phone_number', title: 'Phone Number' },
                { id: 'address', title: 'Address' },
                { id: 'enrollment_date', title: 'Entrollment Date' },
                { id: 'course', title: 'Course' }
            ]
        });

        // Write data to CSV
        csvWriter.writeRecords(results)
            .then(() => {
                console.log('CSV file written successfully.');
                res.download(outputPath, 'students.csv', err => {
                    if (err) {
                        console.error('Error sending file:', err);
                        res.status(500).send('Error sending file');
                    }
                });
            })
            .catch(err => {
                console.error('Error writing CSV file:', err);
                res.status(500).send('Error writing CSV file');
            });
    });
});


app.put('/api/students/:id', (req, res) => {
    const studentId = req.params.id;
    const updatedData = req.body;



    const requiredFields = [
        'first_name',
        'last_name',
        'date_of_birth',
        'gender',
        'email',
        'phone_number',
        'address',
        'enrollment_date',
        'course'
    ];

    for (const field of requiredFields) {
        if (!updatedData[field]) {
            return res.status(400).json({ error: `${field.replace('_', ' ')} is required and cannot be blank.` });
        }
    }



    const updateQuery = `
    UPDATE student
    SET first_name = ?, last_name = ?, date_of_birth = ?, gender = ?, email = ?, phone_number = ?, address = ?, enrollment_date = ?, course = ?
    WHERE student_id = ?;
  `;

    const values = [
        updatedData.first_name,
        updatedData.last_name,
        updatedData.date_of_birth,
        updatedData.gender,
        updatedData.email,
        updatedData.phone_number,
        updatedData.address,
        updatedData.enrollment_date,
        updatedData.course,
        studentId
    ];

    // con.query(updateQuery, values, (err, results) => {
    //     if (err) {
    //         console.error('Error updating student data:', err);
    //         res.status(500).json({ error: `Failed to update student data ${err.message}` });
    //         return;
    //     }

    //     if (results.affectedRows === 0) {
    //         res.status(404).json({ message: 'Student not found' });
    //     } else {
    //         res.status(200).json({ message: 'Student data updated successfully' });
    //     }
    // });

    con.query(updateQuery, values, (err, results) => {
        if (err) {
            console.error('Error inserting data into the student table:', err);
            if (err.code === 'ER_DUP_ENTRY') { // Check for unique constraint violation
                res.status(409).json({ error: 'Email already exists. Please use a different email.' });
            } else {
                res.status(500).json({ error: `Failed to add student data: ${err.message}` });
            }
            return;
        }
        res.status(201).json({ message: 'Student data added successfully', studentId: results.insertId });
    });

});




app.post('/api/students', (req, res) => {
    const studentData = req.body;


    const requiredFields = [
        'first_name',
        'last_name',
        'date_of_birth',
        'gender',
        'email',
        'phone_number',
        'address',
        'enrollment_date',
        'course'
    ];

    for (const field of requiredFields) {
        if (!studentData[field]) {
            return res.status(400).json({ error: `${field.replace('_', ' ')} is required and cannot be blank.` });
        }
    }



    // Insert data into the student table
    const insertQuery = `
    INSERT INTO student (first_name, last_name, date_of_birth, gender, email, phone_number, address, enrollment_date, course)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
  `;
    console.log(studentData);

    const values = [
        studentData.first_name,
        studentData.last_name,
        studentData.date_of_birth,
        studentData.gender,
        studentData.email,
        studentData.phone_number,
        studentData.address,
        studentData.enrollment_date,
        studentData.course
    ];

    con.query(insertQuery, values, (err, results) => {
        if (err) {
            console.error('Error inserting data into the student table:', err);
            if (err.code === 'ER_DUP_ENTRY') { // Check for unique constraint violation
                res.status(409).json({ error: 'Email already exists. Please use a different email.' });
            } else {
                res.status(500).json({ error: `Failed to add student data: ${err.message}` });
            }
            return;
        }
        res.status(201).json({ message: 'Student data added successfully', studentId: results.insertId });
    });
});




app.listen(10000, function () {
    console.log("Started application on port %d", 10000)
});

