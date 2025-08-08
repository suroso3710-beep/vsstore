<?php
header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}





// Koneksi database
$host = 'localhost';
$user = 'root';
$pass = '';
$dbname = 'vsstore_db';

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die(json_encode(['success' => false, 'msg' => 'Koneksi database gagal']));
}

$action = $_POST['action'] ?? $_GET['action'] ?? '';


// Fungsi utilitas
function response($data) {
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

// ✅ Login
// ✅ Login Aman dengan password_hash()
if ($action === 'login') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    $stmt = $conn->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        if (password_verify($password, $user['password'])) {
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['nama'] = $user['nama'];

            response([
                'success' => true,
                'user' => [
                    'username' => $user['username'],
                    'role' => $user['role'],
                    'nama' => $user['nama']
                ]
            ]);

        }
    }
    response(['success' => false, 'msg' => 'Login gagal']);
}


// ✅ Logout
if ($action === 'logout') {
    session_unset();
    session_destroy();
    response(['success' => true]);
}



// ✅ Get Barang
if ($action === 'get_barang') {
    header('Content-Type: application/json');

    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'msg' => 'Unauthorized']);
        exit;
    }

    // 🔍 Jika ada ID dikirim, ambil 1 barang saja
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $stmt = $conn->prepare("SELECT * FROM barang WHERE id = ?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $result = $stmt->get_result();
        $barang = $result->fetch_assoc();

        echo json_encode($barang ?: null); // null jika tidak ditemukan
        exit;
    }

    // 📦 Jika tidak ada ID, ambil semua barang
    $result = $conn->query("SELECT * FROM barang ORDER BY id DESC");
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = $row;
    }

    echo json_encode($data);
    exit;
}


// ✅ Tambah Barang
if ($action === 'add_barang') {
    header('Content-Type: application/json');

    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // ✅ Validasi input
    $required = ['nama', 'harga_beli', 'harga_jual', 'stok'];
    foreach ($required as $key) {
        if (!isset($_POST[$key]) || $_POST[$key] === '') {
            response(['success' => false, 'msg' => "Data '$key' tidak lengkap"]);
        }
    }

    $nama = trim($_POST['nama']);
    $harga_beli = floatval($_POST['harga_beli']);
    $harga_jual = floatval($_POST['harga_jual']);
    $stok = intval($_POST['stok']);

    $stmt = $conn->prepare("INSERT INTO barang (nama, harga_beli, harga_jual, stok) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("sddi", $nama, $harga_beli, $harga_jual, $stok);

    if ($stmt->execute()) {
        response(['success' => true]);
    } else {
        response(['success' => false, 'msg' => 'Gagal menambah barang: ' . $conn->error]);
    }
}


// ✅ Update Stok Barang
// ✅ Update stok barang
if ($action === 'update_stok_barang') {
    header('Content-Type: application/json');

    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // ✅ Validasi input
    $id = intval($_POST['id'] ?? 0);
    $stok = intval($_POST['stok'] ?? -1);

    if ($id <= 0 || $stok < 0) {
        response(['success' => false, 'msg' => 'ID barang atau stok tidak valid']);
    }

    $stmt = $conn->prepare("UPDATE barang SET stok = ? WHERE id = ?");
    $stmt->bind_param("ii", $stok, $id);

    if ($stmt->execute()) {
        response(['success' => true, 'msg' => 'Stok berhasil diperbarui']);
    } else {
        response(['success' => false, 'msg' => 'Gagal update stok: ' . $conn->error]);
    }
}


// ✅ Update Barang
if ($action === 'update_barang') {
    header('Content-Type: application/json');
    
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $id = intval($_POST['id'] ?? 0);
    $nama = trim($_POST['nama'] ?? '');
    $harga_beli = floatval($_POST['harga_beli'] ?? 0);
    $harga_jual = floatval($_POST['harga_jual'] ?? 0);
    $stok = intval($_POST['stok'] ?? -1);

    if ($id <= 0 || !$nama || $harga_beli <= 0 || $harga_jual <= 0 || $stok < 0) {
        response(['success' => false, 'msg' => 'ID barang atau stok tidak valid']);
    }

    $stmt = $conn->prepare("UPDATE barang SET nama=?, harga_beli=?, harga_jual=?, stok=? WHERE id=?");
    $stmt->bind_param("sddii", $nama, $harga_beli, $harga_jual, $stok, $id);

    if ($stmt->execute()) {
        response(['success' => true]);
    } else {
        response(['success' => false, 'msg' => 'Gagal update barang']);
    }
}


if ($action === 'delete_barang') {
    header('Content-Type: application/json');

    // Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // Validasi ID
    $id = intval($_POST['id'] ?? 0);
    if ($id <= 0) {
        response(['success' => false, 'msg' => 'ID barang tidak valid']);
    }

    // Hapus barang
    $stmt = $conn->prepare("DELETE FROM barang WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        response(['success' => true]);
    } else {
        response(['success' => false, 'msg' => 'Gagal menghapus barang']);
    }
}



// ✅ Ambil data belanja
if ($action === 'get_belanja') {
    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }
    $tanggal_mulai = $_GET['tanggal_mulai'] ?? null;
    $tanggal_akhir = $_GET['tanggal_akhir'] ?? null;


    $query = "
        SELECT b.*, u.nama AS user
        FROM belanja b
        LEFT JOIN users u ON b.user_id = u.id
    ";

    if ($tanggal_mulai && $tanggal_akhir) {
        $query .= " WHERE DATE(b.tanggal) BETWEEN ? AND ?";
        $query .= " ORDER BY b.tanggal DESC"; // Pastikan tetap ada ORDER
        $stmt = $conn->prepare($query);
        $stmt->bind_param("ss", $tanggal_mulai, $tanggal_akhir);
    } else {
        $query .= " ORDER BY b.tanggal DESC";
        $stmt = $conn->prepare($query); // tidak ada param
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $row['jumlah'] = (int) $row['jumlah'];
        $row['harga_per_item'] = (float) $row['harga_per_item'];
        $row['harga_jual'] = isset($row['harga_jual']) ? (float) $row['harga_jual'] : 0;
        $row['total_belanja'] = (float) $row['total_belanja'];
        $data[] = $row;
    }

    response($data);
}

if ($action === 'get_transaksi') {
    // ✅ Pastikan user sudah login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $where = [];
    $params = [];
    $types = '';

    // ✅ Filter berdasarkan username (bukan user_id)
    if (!empty($_GET['user'])) {
        $where[] = 'u.username = ?';
        $params[] = $_GET['user'];
        $types .= 's';
    }

    // ✅ Filter berdasarkan rentang tanggal atau 1 tanggal
    if (!empty($_GET['start']) && !empty($_GET['end'])) {
        $where[] = 'DATE(t.tanggal) BETWEEN ? AND ?';
        $params[] = $_GET['start'];
        $params[] = $_GET['end'];
        $types .= 'ss';
    } elseif (!empty($_GET['start'])) {
        $where[] = 'DATE(t.tanggal) = ?';
        $params[] = $_GET['start'];
        $types .= 's';
    }

    // ✅ Query utama dengan LEFT JOIN ke users
    $sql = "
        SELECT t.*, u.username AS user, u.nama AS kasir
        FROM transaksi t
        LEFT JOIN users u ON t.user_id = u.id
    ";

    // Tambahkan kondisi WHERE jika ada
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }

    // Urutkan terbaru dulu
    $sql .= " ORDER BY t.tanggal DESC";

    // ✅ Eksekusi query
    $stmt = $conn->prepare($sql);
    if ($params) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    // ✅ Format hasil untuk frontend
    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[] = [
            'id' => (int)$row['id'],
            'tanggal' => $row['tanggal'],
            'jenis' => $row['jenis'],
            'namaItem' => $row['nama_item'],
            'nominal' => (float)$row['nominal'],
            'keuntungan' => (float)$row['keuntungan'],
            'metodePembayaran' => $row['metode_pembayaran'],
            'aplikasi' => $row['aplikasi'] ?: '-',
            'jumlah' => (int)$row['jumlah'],
            'user' => $row['user'] ?? 'unknown',
            'kasir' => $row['kasir'] ?? 'System',
        ];
    }

    response($data);
}


// ✅ Ambil semua transaksi
// if ($action === 'get_transaksi') {
//     $where = [];
//     $params = [];
//     $types = '';
//     // ✅ Cek login
//     if (!isset($_SESSION['user_id'])) {
//         response(['success' => false, 'msg' => 'Unauthorized']);
//     }

//     // Filter user
//     if (!empty($_GET['user'])) {
//         $where[] = 'u.username = ?';
//         $params[] = $_GET['user_id'];
//         $types .= 's';
//     }

//     // Filter tanggal (start & end)
//     if (!empty($_GET['start']) && !empty($_GET['end'])) {
//         $where[] = 'DATE(t.tanggal) BETWEEN ? AND ?';
//         $params[] = $_GET['start'];
//         $params[] = $_GET['end'];
//         $types .= 'ss';
//     } elseif (!empty($_GET['start'])) {
//         $where[] = 'DATE(t.tanggal) = ?';
//         $params[] = $_GET['start'];
//         $types .= 's';
//     }

//     $sql = "
//         SELECT t.*, u.username AS user, u.nama AS kasir
//         FROM transaksi t
//         LEFT JOIN users u ON t.user_id = u.id
//     ";
//     if ($where) {
//         $sql .= " WHERE " . implode(' AND ', $where);
//     }
//     $sql .= " ORDER BY t.tanggal DESC";

//     $stmt = $conn->prepare($sql);
//     if ($params) {
//         $stmt->bind_param($types, ...$params);
//     }
//     $stmt->execute();
//     $result = $stmt->get_result();

//     $data = [];
//     while ($row = $result->fetch_assoc()) {
//         $data[] = [
//             'id' => (int)$row['id'],
//             'tanggal' => $row['tanggal'],
//             'jenis' => $row['jenis'],
//             'namaItem' => $row['nama_item'],                   // ✅ mapping nama_item
//             'nominal' => (float)$row['nominal'],
//             'keuntungan' => (float)$row['keuntungan'],
//             'metodePembayaran' => $row['metode_pembayaran'],   // ✅ mapping metode_pembayaran
//             'aplikasi' => $row['aplikasi'] ?: '-',
//             'jumlah' => (int)$row['jumlah'],
//             'user' => $row['user'] ?? 'unknown',
//             'kasir' => $row['kasir'] ?? 'System',
//         ];
//     }

//     response($data);
// }


// if ($action === 'add_transaksi') {
//     header('Content-Type: application/json');
//     // ✅ Cek login
//     if (!isset($_SESSION['user_id'])) {
//         response(['success' => false, 'msg' => 'Unauthorized']);
//     }
    

//     $required = ['jenis', 'nama_item', 'nominal', 'keuntungan', 'metode_pembayaran', 'aplikasi', 'jumlah'];
//     foreach ($required as $key) {
//         if (!isset($_POST[$key]) || $_POST[$key] === '') {
//             response(['success' => false, 'msg' => "Data '$key' tidak lengkap"]);
//         }
//     }

//     // Ambil data
//     $user_id     = $_SESSION['user_id']['id'];
//     $jenis       = $_POST['jenis'];
//     $nama_item   = $_POST['nama_item'];
//     $nominal     = floatval($_POST['nominal']);
//     $keuntungan  = floatval($_POST['keuntungan']);
//     $modal       = $nominal - $keuntungan;
//     $metode      = $_POST['metode_pembayaran'];
//     $aplikasi    = $_POST['aplikasi'];
//     $jumlah      = intval($_POST['jumlah']);

//     // ⛳ Pastikan baris saldo untuk aplikasi dan metode tersedia
//     $ensureSaldo = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (CURDATE(), ?, 0)");
//     foreach ([$aplikasi, $metode] as $app) {
//         $ensureSaldo->bind_param("s", $app);
//         $ensureSaldo->execute();
//     }

//     // 💥 Logika saldo berdasarkan jenis transaksi
//     if ($jenis === 'Aksesoris') {
//         // Transaksi Aksesoris: hanya TAMBAH ke metode pembayaran
//         $stmtUp = $conn->prepare("UPDATE saldo SET saldo = saldo + ? WHERE tanggal = CURDATE() AND aplikasi = ?");
//         $stmtUp->bind_param("ds", $nominal, $metode);
//         $stmtUp->execute();
//     } else {
//         // Transaksi Non-Aksesoris: Kurangi dari aplikasi, Tambah ke metode
//         // 🔍 Cek saldo cukup dari aplikasi
//         $cek = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = CURDATE() AND aplikasi = ?");
//         $cek->bind_param("s", $aplikasi);
//         $cek->execute();
//         $result = $cek->get_result()->fetch_assoc();

//         if (!$result || $result['saldo'] < $modal) {
//             response(['success' => false, 'msg' => "Saldo aplikasi '$aplikasi' tidak mencukupi"]);
//         }

//         // ⬇️ Kurangi dari aplikasi
//         $stmt1 = $conn->prepare("UPDATE saldo SET saldo = saldo - ? WHERE tanggal = CURDATE() AND aplikasi = ?");
//         $stmt1->bind_param("ds", $modal, $aplikasi);
//         $stmt1->execute();

//         // ⬆️ Tambah ke metode
//         $stmt2 = $conn->prepare("UPDATE saldo SET saldo = saldo + ? WHERE tanggal = CURDATE() AND aplikasi = ?");
//         $stmt2->bind_param("ds", $nominal, $metode);
//         $stmt2->execute();
//     }

//     // 📝 Simpan transaksi ke tabel
//     $stmt = $conn->prepare("INSERT INTO transaksi (tanggal, jenis, nama_item, nominal, keuntungan, metode_pembayaran, aplikasi, user_id, jumlah)
//                             VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)");
//     $stmt->bind_param("ssddssii", $jenis, $nama_item, $nominal, $keuntungan, $metode, $aplikasi, $user_id, $jumlah);

//     if (!$stmt->execute()) {
//         response(['success' => false, 'msg' => 'Gagal menyimpan transaksi']);
//     }

//     response(['success' => true]);
// }

if ($action === 'add_transaksi') {
    header('Content-Type: application/json');

    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $required = ['jenis', 'nama_item', 'nominal', 'keuntungan', 'metode_pembayaran', 'aplikasi', 'jumlah'];
    foreach ($required as $key) {
        if (!isset($_POST[$key]) || $_POST[$key] === '') {
            response(['success' => false, 'msg' => "Data '$key' tidak lengkap"]);
        }
    }

    // Ambil data
    $user_id     = $_SESSION['user_id']; // ✅ perbaikan: ambil langsung dari session
    $jenis       = $_POST['jenis'];
    $nama_item   = $_POST['nama_item'];
    $nominal     = floatval($_POST['nominal']);
    $keuntungan  = floatval($_POST['keuntungan']);
    $modal       = $nominal - $keuntungan;
    $metode      = $_POST['metode_pembayaran'];
    $aplikasi    = $_POST['aplikasi'];
    $jumlah      = intval($_POST['jumlah']);

    // 🧩 Pastikan baris saldo untuk aplikasi & metode sudah ada
    $ensureSaldo = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (CURDATE(), ?, 0)");
    foreach ([$aplikasi, $metode] as $app) {
        $ensureSaldo->bind_param("s", $app);
        $ensureSaldo->execute();
    }

    // 💰 Logika Saldo:
    if ($jenis === 'Aksesoris') {
        // Transaksi Aksesoris → Tambah ke metode pembayaran
        $stmtUp = $conn->prepare("UPDATE saldo SET saldo = saldo + ? WHERE tanggal = CURDATE() AND aplikasi = ?");
        $stmtUp->bind_param("ds", $nominal, $metode);
        $stmtUp->execute();
    } elseif ($jenis === 'Tarik Tunai') {
        // Tarik Tunai → metode (digital) naik, Tunai turun
        $cekTunai = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = CURDATE() AND aplikasi = 'Tunai'");
        $cekTunai->execute();
        $result = $cekTunai->get_result()->fetch_assoc();
        if (!$result || $result['saldo'] < $modal) {
            response(['success' => false, 'msg' => "Saldo Tunai tidak mencukupi"]);
        }

        // Tambah ke metode digital
        $stmtIn = $conn->prepare("UPDATE saldo SET saldo = saldo + ? WHERE tanggal = CURDATE() AND aplikasi = ?");
        $stmtIn->bind_param("ds", $nominal, $metode);
        $stmtIn->execute();

        // Kurangi Tunai
        $stmtOut = $conn->prepare("UPDATE saldo SET saldo = saldo - ? WHERE tanggal = CURDATE() AND aplikasi = 'Tunai'");
        $stmtOut->bind_param("d", $modal);
        $stmtOut->execute();

    } else {
        // Transaksi Regular (Pulsa, Paket, dll)
        // 🔎 Cek saldo cukup di aplikasi
        $cekApp = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = CURDATE() AND aplikasi = ?");
        $cekApp->bind_param("s", $aplikasi);
        $cekApp->execute();
        $result = $cekApp->get_result()->fetch_assoc();

        if (!$result || $result['saldo'] < $modal) {
            response(['success' => false, 'msg' => "Saldo aplikasi '$aplikasi' tidak mencukupi"]);
        }

        // ⬆ Tambah ke metode pembayaran
        $stmtMetode = $conn->prepare("UPDATE saldo SET saldo = saldo + ? WHERE tanggal = CURDATE() AND aplikasi = ?");
        $stmtMetode->bind_param("ds", $nominal, $metode);
        $stmtMetode->execute();

        // ⬇ Kurangi dari aplikasi
        $stmtApp = $conn->prepare("UPDATE saldo SET saldo = saldo - ? WHERE tanggal = CURDATE() AND aplikasi = ?");
        $stmtApp->bind_param("ds", $modal, $aplikasi);
        $stmtApp->execute();
    }

    // 📝 Simpan transaksi ke database
    $stmt = $conn->prepare("INSERT INTO transaksi (tanggal, jenis, nama_item, nominal, keuntungan, metode_pembayaran, aplikasi, user_id, jumlah)
                            VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->bind_param("ssddssii", $jenis, $nama_item, $nominal, $keuntungan, $metode, $aplikasi, $user_id, $jumlah);

    if (!$stmt->execute()) {
        response(['success' => false, 'msg' => 'Gagal menyimpan transaksi']);
    }

    response(['success' => true]);
}




    // ✅ Update atau Tambah Saldo Harian
    if ($action === 'update_saldo') {
        // ✅ Cek login
        if (!isset($_SESSION['user_id'])) {
            response(['success' => false, 'msg' => 'Unauthorized']);
        }
        error_log("🛠️ POST: " . json_encode($_POST));
    
        if (!isset($_SESSION['user_id'])) {
            response(['success' => false, 'msg' => 'Unauthorized']);
        }
    
        $tanggal = $_POST['tanggal'] ?? null;
        $aplikasi = $_POST['aplikasi'] ?? null;
        $saldo = $_POST['saldo'] ?? null;
    
        if (!$tanggal || !$aplikasi || !is_numeric($saldo)) {
            response(['success' => false, 'msg' => 'Data tidak lengkap']);
        }
    
        $stmt = $conn->prepare("REPLACE INTO saldo (tanggal, aplikasi, saldo) VALUES (?, ?, ?)");
        $stmt->bind_param("ssd", $tanggal, $aplikasi, $saldo);
    
        if ($stmt->execute()) {
            response(['success' => true]);
        } else {
            response(['success' => false, 'msg' => $stmt->error]);
        }
    }
    


// ✅ Ambil saldo hari ini
// if ($action === 'get_saldo') {
//     header('Content-Type: application/json');

//     // ✅ Cek login
//     if (!isset($_SESSION['user_id'])) {
//         response(['success' => false, 'msg' => 'Unauthorized']);
//     }

//     $tanggal = date('Y-m-d');
//     if (!isset($_SESSION['user_id'])) {
//         response(['success' => false, 'msg' => 'Unauthorized']);
//     }

//     // Pastikan semua aplikasi ada dalam saldo hari ini
//     $apps = ['Tunai', 'Brimo', 'Dana', 'Gopay', 'VSSTORE', 'RITA', 'VIVAapps', 'Digipos', 'Simpel', 'SiDompul', 'SeaBank'];
//     foreach ($apps as $app) {
//         $insert = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (?, ?, 0)");
//         $insert->bind_param("ss", $tanggal, $app);
//         $insert->execute();
//     }

//     // Ambil semua saldo untuk hari ini
//     $stmt = $conn->prepare("SELECT tanggal, aplikasi, saldo FROM saldo WHERE tanggal = ?");
//     $stmt->bind_param("s", $tanggal);
//     $stmt->execute();

//     $result = $stmt->get_result();
//     $data = [];

//     while ($row = $result->fetch_assoc()) {
//         $data[] = [
//             'tanggal' => $row['tanggal'],
//             'aplikasi' => $row['aplikasi'],
//             'saldo' => floatval($row['saldo'])
//         ];
//     }

//     echo json_encode($data);
//     exit;
// }

if ($action === 'get_saldo') {
    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // Ambil tanggal dari GET atau default ke hari ini
    $tanggal = $_GET['tanggal'] ?? date('Y-m-d');

    // ✅ Pastikan semua aplikasi sudah ada entri-nya di tabel saldo
    $apps = ['Tunai', 'Brimo', 'Dana', 'Gopay', 'VSSTORE', 'RITA', 'VIVAapps', 'Digipos', 'Simpel', 'SiDompul', 'SeaBank'];
    $insert = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (?, ?, 0)");
    foreach ($apps as $app) {
        $insert->bind_param("ss", $tanggal, $app);
        $insert->execute();
    }

    // ✅ Ambil semua saldo untuk tanggal tersebut
    $stmt = $conn->prepare("SELECT aplikasi, saldo FROM saldo WHERE tanggal = ?");
    $stmt->bind_param("s", $tanggal);
    $stmt->execute();
    $result = $stmt->get_result();

    $data = [];
    while ($row = $result->fetch_assoc()) {
        $data[$row['aplikasi']] = floatval($row['saldo']);
    }

    // ✅ Gunakan response() agar format seragam
    response([
        'success' => true,
        'data' => $data
    ]);
}








if ($action === 'simpan_belanja') {
    header('Content-Type: application/json');



    // ✅ Cek login (pastikan user_id ada dan valid)
    if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $user_id = intval($_SESSION['user_id']);

    // ✅ Validasi input wajib
    $required = ['jenis_belanja', 'nama_barang', 'jumlah', 'harga_per_item', 'total_belanja', 'metode_pembayaran'];
    foreach ($required as $key) {
        if (!isset($_POST[$key]) || ($_POST[$key] === '' && $_POST[$key] !== '0')) {
            response(['success' => false, 'msg' => "Data '$key' tidak lengkap"]);
        }
    }

    // Ambil data
    $jenis_belanja = $_POST['jenis_belanja'];
    $nama_barang = trim($_POST['nama_barang']);
    $jumlah = intval($_POST['jumlah']);
    $harga_per_item = floatval($_POST['harga_per_item']);
    $harga_jual = isset($_POST['harga_jual']) ? floatval($_POST['harga_jual']) : 0;
    $total_belanja = floatval($_POST['total_belanja']);
    $metode_pembayaran = $_POST['metode_pembayaran'];
    $supplier = $_POST['supplier'] ?? '';
    $catatan = $_POST['catatan'] ?? '';
    $is_stock_addition = $jenis_belanja === 'barang' ? 1 : 0;

    // ✅ Pastikan saldo hari ini tersedia
    $stmtSaldo = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (CURDATE(), ?, 0)");
    $stmtSaldo->bind_param("s", $metode_pembayaran);
    $stmtSaldo->execute();

    // 🔍 Cek saldo cukup
    $cekSaldo = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = CURDATE() AND aplikasi = ?");
    $cekSaldo->bind_param("s", $metode_pembayaran);
    $cekSaldo->execute();
    $saldoRow = $cekSaldo->get_result()->fetch_assoc();

    if (!$saldoRow || floatval($saldoRow['saldo']) < $total_belanja) {
        response(['success' => false, 'msg' => "Saldo metode pembayaran '$metode_pembayaran' tidak mencukupi"]);
    }

    // ✅ Simpan ke tabel belanja
    $stmt = $conn->prepare("
        INSERT INTO belanja (
            tanggal, jenis_belanja, nama_barang, jumlah, harga_per_item, harga_jual,
            total_belanja, metode_pembayaran, supplier, catatan, user_id, is_stock_addition
        ) VALUES (
            NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
    ");
    $stmt->bind_param(
        "ssidddsssii",
        $jenis_belanja,
        $nama_barang,
        $jumlah,
        $harga_per_item,
        $harga_jual,
        $total_belanja,
        $metode_pembayaran,
        $supplier,
        $catatan,
        $user_id,
        $is_stock_addition
    );

    if (!$stmt->execute()) {
        response(['success' => false, 'msg' => 'Gagal menyimpan data belanja']);
    }

    // 🔧 Tambah stok jika jenis = barang
    if ($jenis_belanja === 'barang') {
        $cekBarang = $conn->prepare("SELECT id FROM barang WHERE nama = ?");
        $cekBarang->bind_param("s", $nama_barang);
        $cekBarang->execute();
        $result = $cekBarang->get_result();

        if ($barang = $result->fetch_assoc()) {
            $barang_id = $barang['id'];
            $updateBarang = $conn->prepare("
                UPDATE barang SET stok = stok + ?, harga_beli = ?, harga_jual = ? WHERE id = ?
            ");
            $updateBarang->bind_param("iddi", $jumlah, $harga_per_item, $harga_jual, $barang_id);
            $updateBarang->execute();
        } else {
            $tambahBarang = $conn->prepare("
                INSERT INTO barang (nama, harga_beli, harga_jual, stok)
                VALUES (?, ?, ?, ?)
            ");
            $tambahBarang->bind_param("sddi", $nama_barang, $harga_per_item, $harga_jual, $jumlah);
            $tambahBarang->execute();
        }
    }

    // 💸 Kurangi saldo hari ini
    $kurangiSaldo = $conn->prepare("
        UPDATE saldo SET saldo = saldo - ? WHERE tanggal = CURDATE() AND aplikasi = ?
    ");
    $kurangiSaldo->bind_param("ds", $total_belanja, $metode_pembayaran);
    $kurangiSaldo->execute();

    response(['success' => true]);
}




if ($action === 'add_belanja') {
    header('Content-Type: application/json');

    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // Ambil dan validasi input
    $required = ['jenis_belanja', 'nama_barang', 'jumlah', 'harga_per_item', 'total_belanja', 'metode_pembayaran', 'supplier'];
    foreach ($required as $field) {
        if (!isset($_POST[$field]) || $_POST[$field] === '') {
            response(['success' => false, 'msg' => "Data '$field' wajib diisi"]);
        }
    }

    // Data dasar
    $user_id           = $_SESSION['user']['id'];
    $jenis_belanja     = $_POST['jenis_belanja']; // 'barang' atau 'pengeluaran'
    $nama_barang       = $_POST['nama_barang'];
    $jumlah            = intval($_POST['jumlah']);
    $harga_per_item    = floatval($_POST['harga_per_item']);
    $harga_jual        = isset($_POST['harga_jual']) ? floatval($_POST['harga_jual']) : 0;
    $total_belanja     = floatval($_POST['total_belanja']);
    $metode_pembayaran = $_POST['metode_pembayaran'];
    $supplier          = $_POST['supplier'];
    $catatan           = isset($_POST['catatan']) ? $_POST['catatan'] : '';
    $is_stock_addition = isset($_POST['is_stock_addition']) ? intval($_POST['is_stock_addition']) : 0;

    // Pastikan baris saldo hari ini untuk metode pembayaran ada
    $insertSaldo = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (CURDATE(), ?, 0)");
    $insertSaldo->bind_param("s", $metode_pembayaran);
    $insertSaldo->execute();

    // Cek saldo cukup
    $cek = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = CURDATE() AND aplikasi = ?");
    $cek->bind_param("s", $metode_pembayaran);
    $cek->execute();
    $cek_result = $cek->get_result();
    $row = $cek_result->fetch_assoc();

    if (!$row || $row['saldo'] < $total_belanja) {
        response(['success' => false, 'msg' => "Saldo metode pembayaran '$metode_pembayaran' tidak mencukupi"]);
    }

    // Simpan ke tabel belanja
    $stmt = $conn->prepare("INSERT INTO belanja (
        tanggal, jenis_belanja, nama_barang, jumlah, harga_per_item,
        harga_jual, total_belanja, metode_pembayaran, supplier, catatan,
        user_id, is_stock_addition
    ) VALUES (
        NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    )");

    $stmt->bind_param(
        "ssidddssssii",
        $jenis_belanja,
        $nama_barang,
        $jumlah,
        $harga_per_item,
        $harga_jual,
        $total_belanja,
        $metode_pembayaran,
        $supplier,
        $catatan,
        $user_id,
        $is_stock_addition
    );

    if (!$stmt->execute()) {
        response(['success' => false, 'msg' => 'Gagal menyimpan data belanja']);
    }

    // Kurangi saldo dari metode pembayaran
    $stmt2 = $conn->prepare("UPDATE saldo SET saldo = saldo - ? WHERE tanggal = CURDATE() AND aplikasi = ?");
    $stmt2->bind_param("ds", $total_belanja, $metode_pembayaran);
    $stmt2->execute();

    // Jika belanja jenis barang, tambahkan ke stok
    if ($jenis_belanja === 'barang' && $is_stock_addition) {
        // Cek apakah barang sudah ada
        $cekBarang = $conn->prepare("SELECT id FROM barang WHERE nama = ?");
        $cekBarang->bind_param("s", $nama_barang);
        $cekBarang->execute();
        $resultBarang = $cekBarang->get_result();

        if ($rowBarang = $resultBarang->fetch_assoc()) {
            // Barang sudah ada, update stok dan harga terakhir
            $barangId = $rowBarang['id'];
            $updateStok = $conn->prepare("UPDATE barang SET stok = stok + ?, harga_beli = ?, harga_jual = ? WHERE id = ?");
            $updateStok->bind_param("iddi", $jumlah, $harga_per_item, $harga_jual, $barangId);
            $updateStok->execute();
        } else {
            // Barang baru, insert
            $insertBarang = $conn->prepare("INSERT INTO barang (nama, harga_beli, harga_jual, stok) VALUES (?, ?, ?, ?)");
            $insertBarang->bind_param("sddi", $nama_barang, $harga_per_item, $harga_jual, $jumlah);
            $insertBarang->execute();
        }
    }

    response(['success' => true]);
}


// ===========================
// Transfer Saldo (MySQLi)
// ===========================
if ($_SERVER['REQUEST_METHOD'] === 'POST' && ($_POST['action'] ?? '') === 'transfer_saldo') {
    header('Content-Type: application/json');
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $user_id = $_SESSION['user_id'];
    $dari = $_POST['dari_aplikasi'] ?? '';
    $ke = $_POST['ke_aplikasi'] ?? '';
    $jumlah_transfer = floatval($_POST['jumlah_transfer'] ?? 0);
    $biaya_admin = floatval($_POST['biaya_admin'] ?? 0);
    $jumlah_diterima = floatval($_POST['jumlah_diterima'] ?? 0);
    $keterangan = trim($_POST['keterangan'] ?? '');
    $today = date('Y-m-d');

    // ✅ Validasi awal
    if (!$dari || !$ke || $dari === $ke || $jumlah_transfer <= 0 || $jumlah_diterima <= 0) {
        response(['success' => false, 'msg' => 'Data transfer tidak valid!']);
    }

    $conn->begin_transaction();

    try {
        // 1️⃣ Cek saldo asal (lock row)
        $stmt = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = ? AND aplikasi = ? FOR UPDATE");
        $stmt->bind_param('ss', $today, $dari);
        $stmt->execute();
        $stmt->bind_result($saldo_asal);
        $stmt->fetch();
        $stmt->close();
        $saldo_asal = $saldo_asal ?? 0;

        $total_potong = $jumlah_transfer + $biaya_admin;
        if ($saldo_asal < $total_potong) {
            $conn->rollback();
            response(['success' => false, 'msg' => 'Saldo asal tidak mencukupi!']);
        }

        // 2️⃣ Kurangi saldo asal
        $stmt = $conn->prepare("UPDATE saldo SET saldo = saldo - ? WHERE tanggal = ? AND aplikasi = ?");
        $stmt->bind_param('dss', $total_potong, $today, $dari);
        $stmt->execute();
        if ($stmt->affected_rows === 0) {
            // Insert jika belum ada saldo hari ini
            $saldo_negatif = 0 - $total_potong;
            $stmt2 = $conn->prepare("INSERT INTO saldo (tanggal, aplikasi, saldo) VALUES (?, ?, ?)");
            $stmt2->bind_param('ssd', $today, $dari, $saldo_negatif);
            $stmt2->execute();
            $stmt2->close();
        }
        $stmt->close();

        // 3️⃣ Tambah saldo tujuan
        $stmt = $conn->prepare("UPDATE saldo SET saldo = saldo + ? WHERE tanggal = ? AND aplikasi = ?");
        $stmt->bind_param('dss', $jumlah_diterima, $today, $ke);
        $stmt->execute();
        if ($stmt->affected_rows === 0) {
            $stmt2 = $conn->prepare("INSERT INTO saldo (tanggal, aplikasi, saldo) VALUES (?, ?, ?)");
            $stmt2->bind_param('ssd', $today, $ke, $jumlah_diterima);
            $stmt2->execute();
            $stmt2->close();
        }
        $stmt->close();

        // 4️⃣ Simpan riwayat transfer
        $stmt = $conn->prepare("
            INSERT INTO transfer (tanggal, dari_aplikasi, ke_aplikasi, jumlah_transfer, biaya_admin, jumlah_diterima, keterangan, user_id)
            VALUES (NOW(), ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param('ssdddsi', $dari, $ke, $jumlah_transfer, $biaya_admin, $jumlah_diterima, $keterangan, $user_id);
        $stmt->execute();
        $stmt->close();

        // 5️⃣ Simpan log aktivitas
        $stmt = $conn->prepare("
            INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id)
            VALUES (NOW(), 'Transfer', ?, ?, ?)
        ");
        $deskripsi = "Transfer saldo: $dari → $ke";
        $detail = "Jumlah: Rp " . number_format($jumlah_diterima, 0, ',', '.') .
                  ", Biaya admin: Rp " . number_format($biaya_admin, 0, ',', '.') .
                  ", Keterangan: " . ($keterangan ?: 'Tidak ada');
        $stmt->bind_param('ssi', $deskripsi, $detail, $user_id);
        $stmt->execute();
        $stmt->close();

        $conn->commit();
        response(['success' => true]);

    } catch (Exception $e) {
        $conn->rollback();
        response(['success' => false, 'msg' => 'Gagal transfer saldo: '.$e->getMessage()]);
    }
}


if ($action === 'get_transfer') {
    // ✅ Pastikan session aktif
    if (session_status() === PHP_SESSION_NONE) session_start();

    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // ✅ Ambil data transfer + nama user
    $query = "
        SELECT t.id, t.tanggal, t.dari_aplikasi, t.ke_aplikasi,
               t.jumlah_transfer, t.biaya_admin, t.jumlah_diterima,
               t.keterangan, u.nama AS user
        FROM transfer t
        LEFT JOIN users u ON t.user_id = u.id
        ORDER BY t.tanggal DESC
    ";

    $result = $conn->query($query);
    $data = [];

    while ($row = $result->fetch_assoc()) {
        // ✅ Mapping ke camelCase untuk kompatibel dengan frontend lama
        $data[] = [
            'id' => (int) $row['id'],
            // Format tanggal ke ISO 8601 agar aman di JS
            'tanggal' => date('c', strtotime($row['tanggal'])),

            'dariAplikasi' => $row['dari_aplikasi'],
            'keAplikasi' => $row['ke_aplikasi'],
            'jumlahTransfer' => (float) $row['jumlah_transfer'],
            'biayaAdmin' => (float) $row['biaya_admin'],
            'jumlahDiterima' => (float) $row['jumlah_diterima'],
            'keterangan' => $row['keterangan'] ?? '',
            'user' => $row['user'] ?? 'System'
        ];
    }

    response($data);
}




if ($action === 'get_log_aktivitas') {
    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // Ambil log terbaru (misal 500 terakhir, bisa disesuaikan)
    $query = "
        SELECT 
            l.id,
            l.tanggal,
            l.jenis,
            l.deskripsi,
            l.detail,
            u.nama AS user
        FROM log_aktivitas l
        LEFT JOIN users u ON l.user_id = u.id
        ORDER BY l.tanggal DESC
        LIMIT 500
    ";

    $result = $conn->query($query);
    $data = [];

    while ($row = $result->fetch_assoc()) {
        // ✅ Format JSON sesuai versi SQL.js lama
        $data[] = [
            'id'        => (int)$row['id'],
            'tanggal'   => date('c', strtotime($row['tanggal'])), // ISO 8601
            'jenis'     => $row['jenis'],
            'deskripsi' => $row['deskripsi'],
            'detail'    => $row['detail'],
            'user'      => $row['user'] ?: 'System'
        ];
    }

    response($data);
}

if ($action === 'log') {
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $user_id = (int) $_SESSION['user_id'];
    $jenis = $_POST['jenis'] ?? '';
    $deskripsi = $_POST['deskripsi'] ?? '';
    $detail = $_POST['detail'] ?? '';

    $stmt = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) VALUES (NOW(), ?, ?, ?, ?)");
    if (!$stmt) {
        response(['success' => false, 'msg' => 'Query error']);
    }
    $stmt = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) VALUES (NOW(), ?, ?, ?, ?)");
    $stmt->bind_param("sssi", $jenis, $deskripsi, $detail, $user_id); // benar: 4 param, 1 integer


    response(['success' => true]);
}









// =====================================
// EDIT TRANSAKSI
// =====================================
if ($action === 'edit_transaksi') {
    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $id = intval($_POST['id'] ?? 0);
    $nominal = floatval($_POST['nominal'] ?? 0);
    $keuntungan = floatval($_POST['keuntungan'] ?? 0);

    if ($id <= 0 || $nominal <= 0) {
        response(['success' => false, 'msg' => 'Data tidak valid']);
    }

    // Ambil data lama untuk log
    $get = $conn->prepare("SELECT * FROM transaksi WHERE id = ?");
    $get->bind_param("i", $id);
    $get->execute();
    $old = $get->get_result()->fetch_assoc();
    $get->close();

    if (!$old) {
        response(['success' => false, 'msg' => 'Transaksi tidak ditemukan']);
    }

    // Update transaksi di DB
    $stmt = $conn->prepare("UPDATE transaksi SET nominal = ?, keuntungan = ? WHERE id = ?");
    $stmt->bind_param("ddi", $nominal, $keuntungan, $id);

    if ($stmt->execute()) {
        // Catat log aktivitas
        $user_id = $_SESSION['user']['id'];
        $deskripsi = "Edit transaksi: ".$old['nama_item'];
        $detail = "Nominal: Rp ".number_format($old['nominal'],0,",",".")." → Rp ".number_format($nominal,0,",",".").
                  ", Keuntungan: Rp ".number_format($old['keuntungan'],0,",",".")." → Rp ".number_format($keuntungan,0,",",".");

        $log = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) 
                               VALUES (NOW(), 'transaksi', ?, ?, ?)");
        $log->bind_param("ssi", $deskripsi, $detail, $user_id);
        $log->execute();

        response(['success' => true]);
    } else {
        response(['success' => false, 'msg' => 'Gagal mengupdate transaksi']);
    }
}

// =====================================
// DELETE TRANSAKSI
// =====================================
if ($action === 'delete_transaksi') {
    // ✅ Cek login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    $id = intval($_POST['id'] ?? 0);
    if ($id <= 0) {
        response(['success' => false, 'msg' => 'ID tidak valid']);
    }

    // Ambil data transaksi dulu untuk log & restore stok
    $get = $conn->prepare("SELECT * FROM transaksi WHERE id = ?");
    $get->bind_param("i", $id);
    $get->execute();
    $result = $get->get_result();
    $transaksi = $result->fetch_assoc();
    $get->close();

    if (!$transaksi) {
        response(['success' => false, 'msg' => 'Transaksi tidak ditemukan']);
    }

    // Jika jenis aksesoris dan ada jumlah, kembalikan stok
    if (strtolower($transaksi['jenis']) === 'aksesoris' && !empty($transaksi['jumlah'])) {
        $barangName = explode(' (', $transaksi['nama_item'])[0];
        $restore = $conn->prepare("UPDATE barang SET stok = stok + ? WHERE nama = ?");
        $restore->bind_param("is", $transaksi['jumlah'], $barangName);
        $restore->execute();
    }

    // Hapus transaksi
    $stmt = $conn->prepare("DELETE FROM transaksi WHERE id = ?");
    $stmt->bind_param("i", $id);

    if ($stmt->execute()) {
        // Log aktivitas
        $user_id = $_SESSION['user']['id'];
        $deskripsi = "Hapus transaksi: ".$transaksi['nama_item'];
        $detail = "Nominal: Rp ".number_format($transaksi['nominal'],0,",",".").", Keuntungan: Rp ".number_format($transaksi['keuntungan'],0,",",".");

        $log = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) 
                               VALUES (NOW(), 'transaksi', ?, ?, ?)");
        $log->bind_param("ssi", $deskripsi, $detail, $user_id);
        $log->execute();

        response(['success' => true]);
    } else {
        response(['success' => false, 'msg' => 'Gagal menghapus transaksi']);
    }
}



// =====================================
// GET USERS done
// =====================================
if ($action === 'get_users') {
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'message' => 'Unauthorized']);
    }

    $stmt = $conn->prepare("SELECT id, username, nama, role FROM users ORDER BY nama ASC");
    $stmt->execute();
    $result = $stmt->get_result();

    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }

    response($users); // <- ini harus array, bukan object
}





// =====================================
// ADD USER (Kasir) done
// =====================================
if ($action === 'add_user') {
    // Pastikan user sudah login
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'message' => 'Unauthorized']);
    }

    // Ambil data input
    $username = trim($_POST['username'] ?? '');
    $password = trim($_POST['password'] ?? '');
    $nama = trim($_POST['nama'] ?? '');

    // Validasi input kosong
    if ($username === '' || $password === '' || $nama === '') {
        response(['success' => false, 'message' => 'Lengkapi semua data!']);
    }

    // Cek apakah username sudah ada
    $check = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $check->bind_param("s", $username);
    $check->execute();
    $check->store_result();
    if ($check->num_rows > 0) {
        response(['success' => false, 'message' => 'Username sudah digunakan!']);
    }

    // Hash password
    $hash = password_hash($password, PASSWORD_DEFAULT);

    // Simpan user baru
    $stmt = $conn->prepare("INSERT INTO users (username, password, nama, role) VALUES (?, ?, ?, 'kasir')");
    $stmt->bind_param("sss", $username, $hash, $nama);

    if ($stmt->execute()) {
        // Log aktivitas oleh user yang login
        $user_id = $_SESSION['user_id'];
        $deskripsi = "Tambah kasir baru: $nama";
        $detail = "Username: $username";
        $log = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) VALUES (NOW(),'edit_barang',?,?,?)");
        $log->bind_param("ssi", $deskripsi, $detail, $user_id);
        $log->execute();

        response(['success' => true]);
    } else {
        response(['success' => false, 'message' => 'Gagal menambahkan kasir.']);
    }
}


// =====================================
// EDIT KASIR done
// =====================================
if ($action === 'edit_kasir') {
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'message' => 'Unauthorized']);
    }

    $username = trim($_POST['username'] ?? '');
    $nama = trim($_POST['nama'] ?? '');
    $password = $_POST['password'] ?? null;

    if ($username === '' || $nama === '') {
        response(['success' => false, 'message' => 'Nama dan username wajib diisi!']);
    }

    // Siapkan query update
    if ($password && trim($password)) {
        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare("UPDATE users SET nama = ?, password = ? WHERE username = ?");
        $stmt->bind_param("sss", $nama, $hash, $username);
    } else {
        $stmt = $conn->prepare("UPDATE users SET nama = ? WHERE username = ?");
        $stmt->bind_param("ss", $nama, $username);
    }

    if ($stmt->execute()) {
        // ✅ Log aktivitas
        $user_id = $_SESSION['user_id'];
        $deskripsi = "Edit kasir: $nama";
        $detail = "Username: $username";
        $log = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) VALUES (NOW(),'edit_barang',?,?,?)");
        $log->bind_param("ssi", $deskripsi, $detail, $user_id);
        $log->execute();

        response(['success' => true]);
    } else {
        response(['success' => false, 'message' => 'Gagal mengupdate data kasir']);
    }
}


// =====================================
// DELETE KASIR done
// =====================================
if ($action === 'delete_kasir') {
    if (!isset($_SESSION['user_id'])) {
        response(['success' => false, 'message' => 'Unauthorized']);
    }

    $username = trim($_POST['username'] ?? '');
    if ($username === '') {
        response(['success' => false, 'message' => 'Username tidak boleh kosong']);
    }

    // Cek apakah kasir ada dulu
    $check = $conn->prepare("SELECT id, nama FROM users WHERE username = ? AND role = 'kasir'");
    $check->bind_param("s", $username);
    $check->execute();
    $result = $check->get_result();
    $kasir = $result->fetch_assoc();

    if (!$kasir) {
        response(['success' => false, 'message' => 'Kasir tidak ditemukan']);
    }

    // Hapus kasir
    $stmt = $conn->prepare("DELETE FROM users WHERE username = ? AND role = 'kasir'");
    $stmt->bind_param("s", $username);

    if ($stmt->execute()) {
        // ✅ Log aktivitas ke database
        $admin_id = $_SESSION['user_id'];
        $deskripsi = "Hapus kasir: " . $kasir['nama'];
        $detail = "Username: " . $username;
        $log = $conn->prepare("INSERT INTO log_aktivitas (tanggal, jenis, deskripsi, detail, user_id) VALUES (NOW(),'edit_barang',?,?,?)");
        $log->bind_param("ssi", $deskripsi, $detail, $admin_id);
        $log->execute();

        response(['success' => true]);
    } else {
        response(['success' => false, 'message' => 'Gagal menghapus kasir dari database']);
    }
}





if ($action === 'add_stok') {
    header('Content-Type: application/json');

    if (!isset($_SESSION['user_id']) || !is_numeric($_SESSION['user_id'])) {
        response(['success' => false, 'msg' => 'Unauthorized']);
    }

    // Ambil user_id sebagai integer
    $user_id = intval($_SESSION['user_id']);

    // Validasi
    $id = intval($_POST['id'] ?? 0);
    $jumlah = intval($_POST['jumlah'] ?? 0);
    $harga_beli = floatval($_POST['harga_beli'] ?? 0);
    $total_biaya = floatval($_POST['total_biaya'] ?? 0);
    $metode_pembayaran = $_POST['metode_pembayaran'] ?? '';
    $supplier = $_POST['supplier'] ?? '';
    $catatan = $_POST['catatan'] ?? '';

    if ($id <= 0 || $jumlah <= 0 || $harga_beli <= 0 || $total_biaya <= 0 || !$metode_pembayaran) {
        response(['success' => false, 'msg' => 'Data tidak lengkap']);
    }

    // Insert baris saldo jika belum ada
    $stmtSaldo = $conn->prepare("INSERT IGNORE INTO saldo (tanggal, aplikasi, saldo) VALUES (CURDATE(), ?, 0)");
    $stmtSaldo->bind_param("s", $metode_pembayaran);
    $stmtSaldo->execute();

    // Cek saldo
    $stmt = $conn->prepare("SELECT saldo FROM saldo WHERE tanggal = CURDATE() AND aplikasi = ?");
    $stmt->bind_param("s", $metode_pembayaran);
    $stmt->execute();
    $saldoRow = $stmt->get_result()->fetch_assoc();

    if (!$saldoRow || floatval($saldoRow['saldo']) < $total_biaya) {
        response(['success' => false, 'msg' => 'Saldo tidak mencukupi']);
    }

    // Update stok
    $stmt = $conn->prepare("UPDATE barang SET stok = stok + ?, harga_beli = ? WHERE id = ?");
    $stmt->bind_param("idi", $jumlah, $harga_beli, $id);
    $stmt->execute();

    // Simpan ke tabel belanja
    $jenis_belanja = 'barang';
    $stmtBelanja = $conn->prepare("INSERT INTO belanja (tanggal, jenis_belanja, nama_barang, jumlah, harga_per_item, total_belanja, metode_pembayaran, supplier, catatan, user_id, is_stock_addition) 
        SELECT NOW(), ?, nama, ?, ?, ?, ?, ?, ?, ?, 1 FROM barang WHERE id = ?");
    $stmtBelanja->bind_param("siddsssii", $jenis_belanja, $jumlah, $harga_beli, $total_biaya, $metode_pembayaran, $supplier, $catatan, $user_id, $id);

    $stmtBelanja->execute();

    // Kurangi saldo
    $stmt = $conn->prepare("UPDATE saldo SET saldo = saldo - ? WHERE tanggal = CURDATE() AND aplikasi = ?");
    $stmt->bind_param("ds", $total_biaya, $metode_pembayaran);
    $stmt->execute();

    response(['success' => true]);
}




// Jika aksi tidak dikenali
response(['success' => false, 'msg' => 'Invalid action']);




