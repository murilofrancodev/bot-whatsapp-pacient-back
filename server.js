const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const { Client } = require('whatsapp-web.js');
const cron = require('node-cron');
const Patient = require('./models/patients');
const QRCode = require('qrcode');

require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

mongoose.connect('mongodb://localhost:27017/agendamentos', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('Conectado ao MongoDB');
    initializePatients(); 
})
.catch(err => console.error('Erro ao conectar ao MongoDB', err));

const client = new Client();

client.on('qr', (qr) => {
    console.log('QR RECEIVED', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');

    const addPatients = async () => {
        const patients = JSON.parse(process.env.PATIENTS);
        for (const patientData of patients) {
            const patient = new Patient(patientData);
            await patient.save();
            console.log('Paciente adicionado:', patientData.name);
        }
    };

    addPatients();

    // Agendar envio de mensagens
    cron.schedule('0 11 * * 2', async () => {
        const patients = await Patient.find({ appointmentDay: 'Tuesday' });

        patients.forEach(patient => {
            const message = patient.message;
            client.sendMessage(`${patient.phone}@c.us`, message)
                .then(response => {
                    console.log('Mensagem enviada para:', patient.name);
                })
                .catch(err => {
                    console.error('Erro ao enviar mensagem:', err);
                });
        });
    });
});

client.initialize();

app.post('/patients', async (req, res) => {
    try {
        const patient = new Patient(req.body);
        await patient.save();
        res.status(201).json(patient); // Retorna o paciente criado
    } catch (error) {
        console.error('Erro ao adicionar paciente:', error);
        res.status(500).json({ message: 'Erro ao adicionar paciente' });
    }
});

app.delete('/patients/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await Patient.findByIdAndDelete(id);
        if (!result) {
            return res.status(404).json({ message: 'Paciente não encontrado' });
        }
        res.status(204).send(); 
    } catch (error) {
        console.error('Erro ao remover paciente:', error);
        res.status(500).json({ message: 'Erro ao remover paciente' });
    }
});

app.get('/patients', async (req, res) => {
    try {
        const patients = await Patient.find();
        res.status(200).json(patients); 
    } catch (error) {
        console.error('Erro ao obter pacientes:', error);
        res.status(500).json({ message: 'Erro ao obter pacientes' });
    }
});

app.get('/qrcode', async (req, res) => {
    try {
        const qrCodeData = 'QR_CODE_DATA'; 
        const qrCodeImageUrl = await QRCode.toDataURL(qrCodeData); 
        res.status(200).json({ qrCode: qrCodeImageUrl }); 
    } catch (error) {
        console.error('Erro ao gerar QR Code:', error);
        res.status(500).json({ message: 'Erro ao gerar QR Code' });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});