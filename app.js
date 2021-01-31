  const express = require('express');
  const multer = require('multer');
  const ejs = require('ejs');
  const path = require('path');
  const bodyParser = require('body-parser')
  const mysql = require('mysql')
  const fs = require('fs');

  // Init app
  const app = express();

  app.use(bodyParser.urlencoded({ extended: false }))

  app.use(bodyParser.json())



  //MySQL
  const pool =mysql.createPool({
    connectionLimit : 10,
    host: "localhost",
    user: "root",
    password: "",
    database: "provanode",
    multipleStatements: true
  })



  // Get all
  app.get('/table', (req, res) => {


    pool.getConnection((err, connection) => {
        if(err) throw err
        console.log(`connected as id ${connection.threadId}`)


        connection.query('SELECT location, date from inquinamento', (err, rows) => {
            connection.release() //return the connection to pool

            if(!err) {
                res.send(rows)
            } else {
                console.log(err)
            }
        })
    })
  })

  app.get('/:id', (req, res) => {
    pool.getConnection((err, connection) => {
        if(err) throw err
        console.log(`connected as id ${connection.threadId}`)

        connection.query('SELECT * from inquinamento WHERE id = ?', [req.params.id], (err, rows) => {
            connection.release() //return the connection to pool

            if(!err) {
                res.send(rows)
            } else {
                console.log(err)
            }
        })
    })
  }) 




  // Set Storage Engine
  const storage = multer.diskStorage({
      destination: './public/uploads/',
      filename: function(req, file, cb){
          cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
      }
  });







  // Init upload
  const upload = multer({
      storage: storage,
      limits:{filesize: 100000},
      fileFilter: function(req, file, cb){
          checkFileType(file, cb);
      }
  }).single('file');

  // Check File Type
  function checkFileType(file, cb){
      // Allowed ext
      const filetypes = /jpeg|jpg|png/;
      // Check ext
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      // Check mime
      const mimetype = filetypes.test(file.mimetype);
    
      if(mimetype && extname){
        return cb(null,true);
      } else {
        cb('Error: Images Only!');
      }
    }
  


  // EJS
  app.set('view engine', 'ejs');

  // Public Folder
  app.use(express.static('./public'));

  app.get('/', (req, res) => res.render('index'));

  app.post('/upload', (req, res) => {
      upload(req, res, (err) => {
        if(err){
          res.render('index', {
            msg: err
          });
        } else {
          if(req.file == undefined){
            res.render('index', {
              msg: 'Error: No File Selected!'
            });
          } else {
            res.render('index', {
              msg: 'File Uploaded!',
              file: `uploads/${req.file.filename}`
            });

            pool.getConnection((err, connection) => {
              if(err) throw err
              console.log(`connected as id ${connection.threadId}`)
        

              fs.readFile(`public/uploads/${req.file.filename}`, null, function (err, data) {
                const params = req.body

                if (err) {
                  return console.log(err);
                }

                params.image = data;

                connection.query('INSERT INTO inquinamento SET ?', params, (err, rows) => {
                  connection.release() //return the connection to pool
        
                  if(err) {
                      console.log(err)
                  }
              })
              });

              
          })
        }
      }
    })
  })








  const port = 3000;

  app.listen(port, () => console.log(`Server stared on port ${port}`));
