-- Buat database
CREATE DATABASE IF NOT EXISTS vsstore_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Gunakan database
USE vsstore_db;

-- Tabel Users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'kasir') DEFAULT 'kasir',
    nama VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Barang
CREATE TABLE IF NOT EXISTS barang (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nama VARCHAR(255) NOT NULL,
    harga_beli DECIMAL(15,2) NOT NULL,
    harga_jual DECIMAL(15,2) NOT NULL,
    stok INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabel Transaksi
CREATE TABLE IF NOT EXISTS transaksi (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME NOT NULL,
    jenis VARCHAR(50) NOT NULL,
    nama_item TEXT NOT NULL,
    nominal DECIMAL(15,2) NOT NULL,
    keuntungan DECIMAL(15,2) NOT NULL,
    metode_pembayaran VARCHAR(50) NOT NULL,
    aplikasi VARCHAR(50),
    user_id INT NOT NULL,
    jumlah INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel Belanja
CREATE TABLE IF NOT EXISTS belanja (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME NOT NULL,
    jenis_belanja ENUM('barang', 'pengeluaran') DEFAULT 'barang',
    nama_barang VARCHAR(255) NOT NULL,
    jumlah INT NOT NULL,
    harga_per_item DECIMAL(15,2) NOT NULL,
    harga_jual DECIMAL(15,2),
    total_belanja DECIMAL(15,2) NOT NULL,
    metode_pembayaran VARCHAR(50) NOT NULL,
    supplier VARCHAR(255),
    catatan TEXT,
    user_id INT NOT NULL,
    is_stock_addition BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel Transfer
CREATE TABLE IF NOT EXISTS transfer (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME NOT NULL,
    dari_aplikasi VARCHAR(50) NOT NULL,
    ke_aplikasi VARCHAR(50) NOT NULL,
    jumlah_transfer DECIMAL(15,2) NOT NULL,
    biaya_admin DECIMAL(15,2) DEFAULT 0,
    jumlah_diterima DECIMAL(15,2) NOT NULL,
    keterangan TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Tabel Saldo
CREATE TABLE IF NOT EXISTS saldo (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATE NOT NULL,
    aplikasi VARCHAR(50) NOT NULL,
    saldo DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_tanggal_aplikasi (tanggal, aplikasi)
);

-- Tabel Log Aktivitas
CREATE TABLE IF NOT EXISTS log_aktivitas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tanggal DATETIME NOT NULL,
    jenis VARCHAR(50) NOT NULL,
    deskripsi TEXT NOT NULL,
    detail TEXT,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Insert data sample users
INSERT IGNORE INTO users (username, password, role, nama) VALUES 
('admin', 'admin123', 'admin', 'Administrator'),
('kasir', 'kasir123', 'kasir', 'Kasir 1');

-- Insert data sample barang
INSERT IGNORE INTO barang (nama, harga_beli, harga_jual, stok) VALUES 
('Case iPhone 14', 25000, 35000, 15),
('Charger Type-C', 15000, 25000, 20),
('Tempered Glass', 8000, 15000, 30),
('Power Bank 10000mAh', 45000, 65000, 10),
('Earphone Bluetooth', 35000, 55000, 12);

-- Insert data sample saldo untuk hari ini
INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES 
(CURDATE(), 'Tunai', 2000000),
(CURDATE(), 'Brimo', 500000),
(CURDATE(), 'Dana', 300000),
(CURDATE(), 'Gopay', 250000),
(CURDATE(), 'VSSTORE', 400000),
(CURDATE(), 'RITA', 350000),
(CURDATE(), 'VIVAapps', 450000),
(CURDATE(), 'Digipos', 600000),
(CURDATE(), 'Simpel', 300000),
(CURDATE(), 'SiDompul', 200000),
(CURDATE(), 'SeaBank', 400000);

-- Buat index untuk performa yang lebih baik
CREATE INDEX IF NOT EXISTS idx_transaksi_tanggal ON transaksi(tanggal);
CREATE INDEX IF NOT EXISTS idx_transaksi_user ON transaksi(user_id);
CREATE INDEX IF NOT EXISTS idx_belanja_tanggal ON belanja(tanggal);
CREATE INDEX IF NOT EXISTS idx_transfer_tanggal ON transfer(tanggal);
CREATE INDEX IF NOT EXISTS idx_log_tanggal ON log_aktivitas(tanggal);
CREATE INDEX IF NOT EXISTS idx_saldo_tanggal ON saldo(tanggal);