require('dotenv').config();
var express = require('express');
const { restart } = require('nodemon');
var router = express.Router();
const { Cat } = require('../models');
var auth = require('../services/auth');
const multer = require('multer');
const { Storage } = require('@google-cloud/storage');

const uploader = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024, // keep images size < 5 MB
    },
});

const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_ID,
    keyFilename: process.env.FIREBASE_KEY
});

const bucket = storage.bucket(process.env.FIREBASE_BUCKET);

/* GET return all cats */
router.get('/', function(req, res, next) {
    Cat.findAll().then(catList => {
        res.json(catList);
    });
});

/* GET /:id get individual cat */
router.get('/:id', (req, res, next) => {
    const catId = parseInt(req.params.id);

    Cat.findOne({
        where: {
            id: catId
        }
    }).then(theCat => {
        if (theCat) {
            res.json(theCat);
        } else {
            res.status(404).send();
        }
    }, err => {
        res.status(500).send(err);
    })
});

/* POST create a cat */
router.post('/', async (req, res, next) => {

    const user = req.user;

    if (!user) {
        res.status(403).send();
        return;
    }

    // create the cat with the user id

    Cat.create({
        name: req.body.name,
        description: req.body.description,
        UserId: user.id
    }).then(newCat => {
        res.json(newCat);
    }).catch(() => {
        res.status(400).send();
    });
});

/* PUT update a cat */
router.put('/:id', (req, res, next) => {
    const catId = parseInt(req.params.id);

    if (!catId || catId <= 0) {
        res.status(400).send('Invalid ID');
        return;
    }
    
    const user = req.user;

    if (!user) {
        res.status(403).send();
        return;
    }

    Cat.update({
        name: req.body.name,
        description: req.body.description
    }, {
        where: {
            id: catId
        }
    }).then(() => {
        res.status(204).send();
    }).catch(() => {
        res.status(400).send();
    })
    
});

/* DELETE delete a cat */
router.delete('/:id', (req, res, next) => {
    const catId = parseInt(req.params.id);

    if (!catId || catId <= 0) {
        res.status(400).send('Invalid ID');
        return;
    }

    const user = req.user;

    if (!user) {
        res.status(403).send();
        return;
    }

    Cat.destroy({
        where: {
          id: catId
        }
    }).then(() => {
        res.status(204).send();
    }).catch(() => {
        res.status(400).send();
    });
});

/* POST Upload cat photo */
router.post('/:id/photo', uploader.single('image'), async (req, res, next) => {
    const catId = parseInt(req.params.id);

    if (!catId || catId <= 0) {
        res.status(400).send('Invalid ID');
        return;
    }
    
    const user = req.user;

    if (!user) {
        res.status(403).send();
        return;
    }

    try {
        if (!req.file) {
            res.status(400).send('No file uploaded');
            return;
        }

        const blob = bucket.file(req.file.originalname);
        const blobStream = blob.createWriteStream({
            metadata: {
                contentType: req.file.mimetype
            }
        });

        blobStream.on('error', (err) => {
            console.log(err);
            next(err);
        });

        blobStream.on('finish', () => {
            const encodedName = encodeURI(blob.name);
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedName}?alt=media`;

            Cat.update({
                imageUrl: publicUrl
            }, {
                where: {
                    id: catId
                }
            }).then(() => {
                res.status(200).send({
                    fileName: req.file.originalname,
                    fileLocation: publicUrl
                });
            }).catch(() => {
                res.status(400).send();
            })

            res.send(publicUrl);
        });

        blobStream.end(req.file.buffer);

    } catch (error) {
        res.status(400).send(`Error uploading file: ${error}`)
    }
});


module.exports = router;
