const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const porta = 3030;

const db = new sqlite3.Database('./banco.db');

db.run(`
    CREATE TABLE IF NOT EXISTS agendamentos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dataHora DATETIME NOT NULL,
    paciente TEXT NOT NULL,
    medico TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('marcado', 'cancelado', 'concluido'))
);
`);

app.use(express.json());
app.use(cors());

app.get('/agendamentos', (req, res) => {
    const sql = 'SELECT * FROM agendamentos';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ agendamentos: rows });
    });
});

app.post('/agendamentos', (req, res) => {
    const { datahora, paciente, medico, status } = req.body;
    const s = 'marcado';

    const dataAtual = new Date();
    const dataAgendamento = new Date(datahora);

    if (dataAgendamento < dataAtual) {
        return res.status(400).json({ error: 'A data e hora fornecidas estão no passado.' });
    }
    db.all('SELECT * FROM agendamentos WHERE datahora=? AND medico=? AND status=?', 
           [datahora, medico, s], 
           (err, rows) => {   
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (rows.length === 0) { 
            const sql = 'INSERT INTO agendamentos (datahora, paciente, medico, status) VALUES (?, ?, ?, ?)';
            
            db.run(sql, [datahora, paciente, medico, status], function(err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json({ message: 'Agendamento criado com sucesso!', id: this.lastID });
            });          
        } else {
            res.status(409).json({ message: 'Conflito! Já existe um agendamento para este medico no horario enviado' });
        }
    });
});

app.put('/agendamentos/:id', (req, res) => {
    const id = req.params.id;
    
    const sql = 'UPDATE agendamentos SET status = ? WHERE id = ?';
    
    db.run(sql, ['cancelado', id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: 'Agendamento não encontrado!' });
        }
        res.json({ message: 'Agendamento cancelado com sucesso!' });
    });
});

app.listen(porta, () => {
  console.log(`Servidor rodando em localhost:${porta}`);
});
