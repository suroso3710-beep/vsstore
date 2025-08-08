
    // sudah
    // Data storage
    let currentUser = null;


    let barangData = []; // Biarkan kosong, nanti akan diisi dari MySQL

    let transaksiData = []; // Default kosong, nanti diisi dari server

    let belanjaData = [];
    let transferData = [];
    let saldoData = {};
    let logAktivitasData = [];
    

    let userData = []; // data user diambil dari login MySQL, bukan dummy



    // Log pagination
    let currentLogPage = 1;
    let logItemsPerPage = 20;
    let filteredLogData = [];
            
    let currentUserRole = null;

    


    // Login function (MySQL) sudah
    async function login() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();

        if (!username || !password) {
            alert('Masukkan username dan password!');
            return;
        }

        const fd = new FormData();
        fd.append('username', username);
        fd.append('password', password);

        const res = await fetch('api.php?action=login', {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const json = await res.json();

        if (json.success) {
            currentUser = json.user.username;
            currentUserRole = json.user.role;
            document.getElementById('currentUser').textContent = json.user.nama;
            document.getElementById('loginPage').classList.add('hidden');
            document.getElementById('dashboard').classList.remove('hidden');
            setupUserInterface();
            loadDashboard();
            loadAllData(); // Load semua data dari MySQL
        } else {
            alert(json.msg || 'Username atau password salah!');
        }
    }

    // Setup user interface based on role
    function setupUserInterface() {
        const navTabs = document.querySelectorAll('.tab-btn');
    
        if (currentUserRole === 'kasir') {
            // Hide admin-only tabs for kasir
            navTabs.forEach(tab => {
                const tabText = tab.textContent.trim();
                if (tabText.includes('Laporan Belanja') || 
                    tabText.includes('Log Aktivitas')) {
                    tab.style.display = 'none';
                }
            });
    
            // Hide admin-specific tabs
            const kelolaKasir = document.getElementById('kelolaKasirTab');
            const laporanKasir = document.getElementById('laporanKasirTab');
            if (kelolaKasir) kelolaKasir.style.display = 'none';
            if (laporanKasir) laporanKasir.style.display = 'none';
    
            // Setup saldo tab for kasir (view only)
            const inputSaldo = document.getElementById('inputSaldoSection');
            const kasirViewOnly = document.getElementById('kasirViewOnlySection');
            if (inputSaldo) inputSaldo.style.display = 'none';
            if (kasirViewOnly) kasirViewOnly.style.display = 'block';
    
        } else if (currentUserRole === 'admin') {
            // Show all tabs for admin
            navTabs.forEach(tab => {
                tab.style.display = 'block';
            });
    
            // Show admin-specific tabs
            const kelolaKasir = document.getElementById('kelolaKasirTab');
            const laporanKasir = document.getElementById('laporanKasirTab');
            if (kelolaKasir) kelolaKasir.style.display = 'block';
            if (laporanKasir) laporanKasir.style.display = 'block';
    
            // Setup saldo tab for admin (full access)
            const inputSaldo = document.getElementById('inputSaldoSection');
            const kasirViewOnly = document.getElementById('kasirViewOnlySection');
            if (inputSaldo) inputSaldo.style.display = 'block';
            if (kasirViewOnly) kasirViewOnly.style.display = 'none';
        }
    }
    

    // Logout function (MySQL)
    async function logout() {
        await fetch('api.php?action=logout', {credentials:'include'});
        currentUser = null;
        currentUserRole = null;
        document.getElementById('loginPage').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';

        // Reset all tabs to visible
        document.querySelectorAll('.tab-btn').forEach(tab => {
            tab.style.display = 'block';
        });
    }

    // Allow Enter key to login
    document.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !document.getElementById('loginPage').classList.contains('hidden')) {
            login();
        }
    });

    // Log activity function (MySQL)
    async function logActivity(jenis, deskripsi, detail = '') {
        const fd = new FormData();
        fd.append('jenis', jenis);
        fd.append('deskripsi', deskripsi);
        fd.append('detail', detail);
    
        try {
            const res = await fetch('api.php?action=log', {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });
        
            const text = await res.text();
            let result;
        
            try {
                result = JSON.parse(text);
            } catch (err) {
                console.error('❌ logActivity() error:', err, '\nResponse:', text); // ✅ debug di sini
                return;
            }
        
            if (!result.success) {
                console.warn('❗ Gagal mencatat log:', result.msg || '(Tidak diketahui)');
            }
        
            // Reload jika tab log aktif
            if (document.getElementById('tab-log')?.classList.contains('active')) {
                loadLogAktivitasData();
            }
        } catch (err) {
            console.error('❌ logActivity() error:', err);
        }
        
    }
    

    // Handle jenis transaksi change sudah
    async function handleJenisTransaksiChange() {
        const jenisTransaksi = document.getElementById('jenisTransaksi').value;
        const itemInputContainer = document.getElementById('itemInputContainer');
        const quantityContainer = document.getElementById('quantityContainer');
        const aplikasiContainer = document.getElementById('aplikasiContainer');
    
        // Reset form fields
        document.getElementById('nominal').value = '';
        document.getElementById('keuntungan').value = '';
        document.getElementById('jumlahBarang').value = '1';
        document.getElementById('saldoInfo').classList.add('hidden');
    
        // Ambil data barang dari MySQL (hanya jika belum ada)
        if (!Array.isArray(barangData) || barangData.length === 0) {
            try {
                const res = await fetch('api.php?action=get_barang', { credentials: 'include' });
                barangData = await res.json();
            } catch (err) {
                console.error('Gagal mengambil data barang:', err);
                barangData = [];
            }
        }
    
        // --- AKSESORIS ---
        if (jenisTransaksi === 'Aksesoris') {
            itemInputContainer.innerHTML = `
                <select id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" onchange="handleBarangSelection()">
                    <option value="">Pilih Barang</option>
                    ${barangData.map(barang => {
                        const hargaJual = parseInt(barang.harga_jual) || 0;
                        return `
                            <option value="${barang.id}" 
                                data-nama="${barang.nama}" 
                                data-harga-beli="${barang.harga_beli}" 
                                data-harga-jual="${barang.harga_jual}" 
                                data-stok="${barang.stok}">
                                ${barang.nama} - Rp ${hargaJual.toLocaleString()} (Stok: ${barang.stok})
                            </option>`;
                    }).join('')}
                </select>
            `;
    
            quantityContainer.classList.remove('hidden');
            aplikasiContainer.classList.add('hidden');
            updatePaymentOptions('default');
    
        // --- PULSA, PAKET DATA, PLN ---
        } else if (['Pulsa', 'Paket Data', 'PLN'].includes(jenisTransaksi)) {
            const placeholder = jenisTransaksi === 'Pulsa' 
                ? 'Pulsa Telkomsel 50k' 
                : jenisTransaksi === 'Paket Data' 
                    ? 'Paket Data XL 10GB' 
                    : 'Token PLN 100k';
    
            itemInputContainer.innerHTML = `
                <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: ${placeholder}">
            `;
    
            quantityContainer.classList.add('hidden');
            aplikasiContainer.classList.remove('hidden');
            updatePaymentOptions('pulsa_pln');
    
        // --- TRANSFER ---
        } else if (jenisTransaksi === 'Transfer') {
            itemInputContainer.innerHTML = `
                <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: Transfer Bank BCA">
            `;
    
            quantityContainer.classList.add('hidden');
            aplikasiContainer.classList.remove('hidden');
            updatePaymentOptions('transfer');
    
        // --- TARIK TUNAI ---
        } else if (jenisTransaksi === 'Tarik Tunai') {
            itemInputContainer.innerHTML = `
                <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: Tarik Tunai Dana">
            `;
    
            quantityContainer.classList.add('hidden');
            aplikasiContainer.classList.remove('hidden');
            updatePaymentOptions('tarik_tunai');
    
        // --- DEFAULT (LAINNYA) ---
        } else {
            itemInputContainer.innerHTML = `
                <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: Top Up DANA 50k">
            `;
    
            quantityContainer.classList.add('hidden');
            aplikasiContainer.classList.remove('hidden');
            updatePaymentOptions('default');
        }
    }
    

    // Update payment options based on transaction type
    function updatePaymentOptions(type) {
        const metodePembayaranSelect = document.getElementById('metodePembayaran');
        const aplikasiTransaksiSelect = document.getElementById('aplikasiTransaksi');
        
        // Clear existing options
        metodePembayaranSelect.innerHTML = '';
        aplikasiTransaksiSelect.innerHTML = '';
        
        if (type === 'pulsa_pln') {
            metodePembayaranSelect.innerHTML = '<option value="Tunai">Tunai</option>';
            aplikasiTransaksiSelect.innerHTML = `
                <option value="Dana">Dana</option>
                <option value="Gopay">Gopay</option>
                <option value="VSSTORE">VSSTORE</option>
                <option value="RITA">RITA</option>
                <option value="VIVAapps">VIVAapps</option>
                <option value="Digipos">Digipos</option>
                <option value="Simpel">Simpel</option>
                <option value="SiDompul">SiDompul</option>
            `;
        } else if (type === 'transfer') {
            metodePembayaranSelect.innerHTML = `
                <option value="Tunai">Tunai</option>
                <option value="Brimo">Brimo</option>
                <option value="Dana">Dana</option>
                <option value="Gopay">Gopay</option>
                <option value="SeaBank">SeaBank</option>
            `;
            aplikasiTransaksiSelect.innerHTML = `
                <option value="Brimo">Brimo</option>
                <option value="Dana">Dana</option>
                <option value="Gopay">Gopay</option>
                <option value="SeaBank">SeaBank</option>
            `;
        } else if (type === 'tarik_tunai') {
            metodePembayaranSelect.innerHTML = `
                <option value="Tunai">Tunai</option>
                <option value="Brimo">Brimo</option>
                <option value="Dana">Dana</option>
                <option value="Gopay">Gopay</option>
                <option value="SeaBank">SeaBank</option>
            `;
            aplikasiTransaksiSelect.innerHTML = '<option value="Tunai">Tunai</option>';
        } else {
            // Default options
            metodePembayaranSelect.innerHTML = `
                <option value="Tunai">Tunai</option>
                <option value="Brimo">Brimo</option>
                <option value="Dana">Dana</option>
                <option value="Gopay">Gopay</option>
                <option value="VSSTORE">VSSTORE</option>
                <option value="RITA">RITA</option>
                <option value="VIVAapps">VIVAapps</option>
                <option value="Digipos">Digipos</option>
                <option value="Simpel">Simpel</option>
                <option value="SiDompul">SiDompul</option>
                <option value="SeaBank">SeaBank</option>
            `;
            aplikasiTransaksiSelect.innerHTML = metodePembayaranSelect.innerHTML;
        }
    }


    // Handle barang selection
    function handleBarangSelection() {
        const select = document.getElementById('namaItem');
        const selectedOption = select.options[select.selectedIndex];
    
        if (selectedOption && selectedOption.value) {
            const hargaJual = parseInt(selectedOption.dataset.hargaJual) || 0;
            const hargaBeli = parseInt(selectedOption.dataset.hargaBeli) || 0;
            const stok = parseInt(selectedOption.dataset.stok) || 0;
    
            // Tampilkan info stok
            const stokTersediaEl = document.getElementById('stokTersedia');
            stokTersediaEl.textContent = stok;
            document.getElementById('stokInfo').classList.remove('hidden');
    
            // Warna teks tergantung stok
            stokTersediaEl.className = 'font-semibold ' + (stok > 0 ? 'text-green-600' : 'text-red-600');
    
            // Atur jumlah pembelian dan maksimal
            const jumlahBarangEl = document.getElementById('jumlahBarang');
            jumlahBarangEl.value = '1';
            jumlahBarangEl.max = stok;
    
            // Set nominal dan keuntungan ke input tersembunyi
            document.getElementById('nominal').value = hargaJual;
            document.getElementById('keuntungan').value = hargaJual - hargaBeli;
    
            // Hitung ulang total
            updateTotalHarga();
    
        } else {
            // Reset jika tidak ada barang dipilih
            document.getElementById('stokInfo').classList.add('hidden');
            document.getElementById('stokTersedia').textContent = '';
            document.getElementById('nominal').value = '';
            document.getElementById('keuntungan').value = '';
        }
    }
    

    // Update total harga based on quantity
    function updateTotalHarga() {
        const select = document.getElementById('namaItem');
        const jumlah = parseInt(document.getElementById('jumlahBarang').value) || 1;
    
        // Hanya lanjut jika dropdown valid
        if (select.tagName === 'SELECT' && select.value) {
            const selectedOption = select.options[select.selectedIndex];
    
            const hargaJual = parseInt(selectedOption.dataset.hargaJual) || 0;
            const hargaBeli = parseInt(selectedOption.dataset.hargaBeli) || 0;
            const stok = parseInt(selectedOption.dataset.stok) || 0;
    
            // Validasi stok
            if (jumlah > stok) {
                alert(`Jumlah tidak boleh melebihi stok yang tersedia (${stok})`);
                document.getElementById('jumlahBarang').value = stok;
                return;
            }
    
            // Hitung total
            const totalHargaJual = hargaJual * jumlah;
            const totalKeuntungan = (hargaJual - hargaBeli) * jumlah;
    
            // Simpan ke form untuk disubmit
            document.getElementById('nominal').value = totalHargaJual;
            document.getElementById('keuntungan').value = totalKeuntungan;
        }
    }
    

    //load brang di transaksi
    async function loadBarang() {
    // Hindari fetch ulang jika data sudah ada
    if (barangData.length > 0) return;

    try {
        const res = await fetch('api.php?action=get_barang', { credentials: 'include' });

        if (!res.ok) {
            console.error('❌ Gagal fetch barang: HTTP', res.status);
            alert('Gagal memuat data barang dari server.');
            return;
        }

        const data = await res.json();

        if (!Array.isArray(data)) {
            console.error('❌ Format data barang tidak valid:', data);
            alert('Data barang dari server tidak valid.');
            return;
        }

        barangData = data;

    } catch (error) {
        console.error('❌ Error saat loadBarang():', error);
        alert('Terjadi kesalahan saat memuat data barang.');
    }
    }


    // Check saldo aplikasi when application is selected
    // Cek saldo aplikasi dari MySQL

    async function checkSaldoAplikasiAsal() {
        const aplikasi = document.getElementById('metodePembayaran').value;
        const saldoInfo = document.getElementById('saldoInfoAsal');
        const saldoTersedia = document.getElementById('saldoTersediaAsal');
    
        if (!aplikasi) {
            saldoInfo.classList.add('hidden');
            return;
        }
    
        try {
            const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
    
            if (!res.ok) {
                console.error('❌ Gagal fetch saldo:', res.status);
                saldoTersedia.textContent = 'Rp 0';
                saldoTersedia.className = 'font-semibold text-red-600';
                saldoInfo.classList.remove('hidden');
                return;
            }
    
            const response = await res.json();
    
            // Validasi apakah data berupa object dan memiliki key aplikasi
            const saldoRaw = response.data?.[aplikasi];
    
            if (saldoRaw === undefined) {
                console.error('❌ Data saldo tidak valid untuk aplikasi:', aplikasi, response);
                saldoTersedia.textContent = 'Rp 0';
                saldoTersedia.className = 'font-semibold text-red-600';
                saldoInfo.classList.remove('hidden');
                return;
            }
    
            const saldo = parseFloat(saldoRaw) || 0;
    
            saldoTersedia.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
            saldoTersedia.className = saldo > 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
    
        } catch (error) {
            console.error('❌ Error saat cek saldo aplikasi:', error);
            saldoTersedia.textContent = 'Rp 0';
            saldoTersedia.className = 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
        }
    }

    async function checkSaldoAplikasi() {
        const aplikasi = document.getElementById('aplikasiTransaksi').value;
        const saldoInfo = document.getElementById('saldoInfo');
        const saldoTersedia = document.getElementById('saldoTersedia');
    
        if (!aplikasi) {
            saldoInfo.classList.add('hidden');
            return;
        }
    
        try {
            const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
    
            if (!res.ok) {
                console.error('❌ Gagal fetch saldo:', res.status);
                saldoTersedia.textContent = 'Rp 0';
                saldoTersedia.className = 'font-semibold text-red-600';
                saldoInfo.classList.remove('hidden');
                return;
            }
    
            const response = await res.json();
    
            // Validasi apakah data berupa object dan memiliki key aplikasi
            const saldoRaw = response.data?.[aplikasi];
    
            if (saldoRaw === undefined) {
                console.error('❌ Data saldo tidak valid untuk aplikasi:', aplikasi, response);
                saldoTersedia.textContent = 'Rp 0';
                saldoTersedia.className = 'font-semibold text-red-600';
                saldoInfo.classList.remove('hidden');
                return;
            }
    
            const saldo = parseFloat(saldoRaw) || 0;
    
            saldoTersedia.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
            saldoTersedia.className = saldo > 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
    
        } catch (error) {
            console.error('❌ Error saat cek saldo aplikasi:', error);
            saldoTersedia.textContent = 'Rp 0';
            saldoTersedia.className = 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
        }
    }
    
    
    
    //sudah

    async function loadBelanja() {
        const container = document.getElementById('riwayatBelanja');
        const totalElem = document.getElementById('totalBelanjaHariIni');
    
        try {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Memuat...</p>';
    
            const res = await fetch('api.php?action=get_belanja', { credentials: 'include' });
            const belanjaData = await res.json();
    
            const today = new Date().toISOString().split('T')[0];
            const todayData = belanjaData.filter(b => b.tanggal.startsWith(today));
    
            if (todayData.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada data belanja hari ini.</p>';
                totalElem.textContent = 'Rp 0';
                return;
            }
    
            container.innerHTML = '';
            let total = 0;
    
            todayData.forEach(item => {
                total += parseFloat(item.total);
    
                const div = document.createElement('div');
                div.className = 'border-b pb-2 mb-2';
                div.innerHTML = `
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="font-semibold text-gray-800">${item.nama_barang}</p>
                            <p class="text-sm text-gray-500">${item.jenis === 'pengeluaran' ? 'Pengeluaran' : 'Belanja Barang'} • ${item.metode_pembayaran}</p>
                            <p class="text-xs text-gray-400">${new Date(item.tanggal).toLocaleTimeString()} • ${item.supplier}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-red-600">-Rp ${parseFloat(item.total).toLocaleString()}</p>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
    
            totalElem.textContent = `Rp ${total.toLocaleString()}`;
    
        } catch (error) {
            console.error("❌ Gagal load belanja:", error);
            container.innerHTML = '<p class="text-red-500 text-center py-4">Gagal memuat data belanja dari server.</p>';
            totalElem.textContent = 'Rp 0';
        }
    }
    
    
    

    // Tab navigation MySQL
    function showTab(tabName, e = null) {
        // Sembunyikan semua konten tab
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.add('hidden');
        });
    
        // Reset tampilan semua tombol tab
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('border-primary', 'text-primary');
            btn.classList.add('border-transparent', 'text-gray-500');
        });
    
        // Tampilkan tab yang dipilih
        const activeTab = document.getElementById(`${tabName}Tab`);
        if (activeTab) activeTab.classList.remove('hidden');
    
        // Aktifkan tombol tab yang dipilih
        if (e?.target) {
            e.target.classList.add('border-primary', 'text-primary');
            e.target.classList.remove('border-transparent', 'text-gray-500');
        } else {
            const matchingBtn = document.querySelector(`.tab-btn[onclick*="showTab('${tabName}'"]`);
            if (matchingBtn) {
                matchingBtn.classList.add('border-primary', 'text-primary');
                matchingBtn.classList.remove('border-transparent', 'text-gray-500');
            }
        }
    
        // Muat data sesuai tab
        switch (tabName) {
            case 'barang':
                loadBarangData();
                break;
            case 'saldo':
                loadSaldoData();
                break;
            case 'belanja':
                loadBelanjaData();
                break;
            case 'laporan-belanja':
                loadLaporanBelanjaData();
                break;
            case 'transfer-saldo':
                loadTransferData();
                break;
            case 'log-aktivitas':
                loadLogAktivitasData();
                break;
            case 'laporan':
                loadLaporanData();
                break;
            case 'kelola-kasir':
                loadKelolaKasirData();
                break;
            case 'laporan-kasir':
                loadLaporanKasirData();
                break;
            case 'transaksi':
                loadRiwayatTransaksi();
                updateTotalHariIni();
                break;
            default:
                console.warn(`Tab "${tabName}" tidak dikenali.`);
        }
    }
    
    
    
    // sudah


    // Simpan transaksi
    // async function simpanTransaksi() {
    //     const uangDiterima = parseFloat(document.getElementById('nominal').value);
    //     const hargaModal = parseFloat(document.getElementById('keuntungan').value);
    //     const keuntungan = uangDiterima - hargaModal;
    //     const metodePembayaran = document.getElementById('metodePembayaran').value;
    //     const aplikasiTransaksi = document.getElementById('aplikasiTransaksi').value;
    //     const jenisTransaksi = document.getElementById('jenisTransaksi').value;
    //     const namaItemElement = document.getElementById('namaItem');
    
    //     // Validasi input
    //     if (!jenisTransaksi) return alert('Pilih jenis transaksi!');
    //     if (!namaItemElement.value) return alert('Masukkan nama item/layanan!');
    //     if (!uangDiterima || uangDiterima <= 0) return alert('Masukkan nominal yang valid!');
    //     if (!hargaModal || hargaModal <= 0) return alert('Masukkan harga modal yang valid!');
    //     if (jenisTransaksi !== 'Aksesoris' && !aplikasiTransaksi) return alert('Pilih aplikasi yang digunakan!');
    
    //     let namaItem = '';
    //     let jumlahBarang = 1;
    //     let barangId = null;
    
    //     if (jenisTransaksi === 'Aksesoris') {
    //         if (namaItemElement.tagName === 'SELECT') {
    //             const selectedOption = namaItemElement.options[namaItemElement.selectedIndex];
    //             if (!selectedOption.value) return alert('Pilih barang yang akan dijual!');
                
    //             barangId = parseInt(selectedOption.value);
    //             jumlahBarang = parseInt(document.getElementById('jumlahBarang').value) || 1;
    //             const stok = parseInt(selectedOption.dataset.stok);
    
    //             if (stok < jumlahBarang) return alert(`Stok tidak mencukupi! Stok tersedia: ${stok}`);
    
    //             namaItem = `${selectedOption.dataset.nama} (${jumlahBarang}x)`;
    
    //             await fetch('api.php?action=update_stok_barang', {
    //                 method: 'POST',
    //                 body: new URLSearchParams({ id: barangId, stok: stok - jumlahBarang }),
    //                 credentials: 'include'
    //             });
    //         } else {
    //             namaItem = namaItemElement.value;
    //         }
    //     } else {
    //         namaItem = namaItemElement.value;
    //     }
    
    //     // Kirim data ke MySQL
    //     const fd = new FormData();
    //     fd.append('jenis', jenisTransaksi);
    //     fd.append('nama_item', namaItem);
    //     fd.append('nominal', uangDiterima);
    //     fd.append('keuntungan', keuntungan);
    //     fd.append('metode_pembayaran', metodePembayaran);
    //     fd.append('aplikasi', jenisTransaksi === 'Aksesoris' ? metodePembayaran : (aplikasiTransaksi || 'Tunai'));
    //     fd.append('jumlah', jumlahBarang);
    
    //     try {
    //         const res = await fetch('api.php?action=add_transaksi', {
    //             method: 'POST',
    //             body: fd,
    //             credentials: 'include'
    //         });
            
    //         const rawText = await res.text();
    //         let json;
    //         try {
    //             json = JSON.parse(rawText);
    //             console.log("📦 Respon transaksi:", json);
    //         } catch (e) {
    //             console.error("❌ Gagal parse JSON:", rawText);
    //             alert("❌ Terjadi kesalahan di server saat menyimpan transaksi.");
    //             return;
    //         }
            
    //         console.log("✅ Respon transaksi:", json);
    
    //         if (!json.success) {
    //             alert(json.msg || 'Gagal menyimpan transaksi ke database!');
    //             return;
    //         }
    
    //         // Log aktivitas
    //         logActivity('Transaksi', `Transaksi ${jenisTransaksi}: ${namaItem}`, 
    //             `Nominal: Rp ${uangDiterima.toLocaleString()}, Keuntungan: Rp ${keuntungan.toLocaleString()}, Metode: ${metodePembayaran}`);
    
    //         // Reset form
    //         document.getElementById('jenisTransaksi').value = '';
    //         document.getElementById('itemInputContainer').innerHTML = `
    //             <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: Pulsa Telkomsel 50k">`;
    //         document.getElementById('quantityContainer').classList.add('hidden');
    //         document.getElementById('stokInfo').classList.add('hidden');
    //         document.getElementById('nominal').value = '';
    //         document.getElementById('keuntungan').value = '';
    //         document.getElementById('jumlahBarang').value = '1';
    //         document.getElementById('metodePembayaran').value = 'Tunai';
    //         document.getElementById('aplikasiTransaksi').value = 'Tunai';
    //         document.getElementById('saldoInfo').classList.add('hidden');
    
    //         // Refresh
    //         loadRiwayatTransaksi();
    //         updateTotalHariIni();
    //         loadSaldoData();
    //         if (jenisTransaksi === 'Aksesoris') {
    //             if (typeof loadBarang === 'function') {
    //                 loadBarang();
    //             } else if (typeof loadBarangData === 'function') {
    //                 loadBarangData(); // fallback kalau namanya loadBarangData
    //             }
    //         }
            
    
    //         alert('✅ Transaksi berhasil disimpan!');
    //     } catch (error) {
    //         console.error('❌ Error simpanTransaksi:', error);
    //         alert('Terjadi kesalahan saat menyimpan transaksi.');
    //     }
    // }


    async function simpanTransaksi() {
        const uangDiterima = parseFloat(document.getElementById('nominal').value);
        const jenisTransaksi = document.getElementById('jenisTransaksi').value;
        const namaItemElement = document.getElementById('namaItem');
        const metodePembayaran = document.getElementById('metodePembayaran').value;
        const aplikasiTransaksi = document.getElementById('aplikasiTransaksi').value;
    
        // Validasi input dasar
        if (!jenisTransaksi) return alert('Pilih jenis transaksi!');
        if (!namaItemElement.value) return alert('Masukkan nama item/layanan!');
        if (!uangDiterima || uangDiterima <= 0) return alert('Masukkan nominal yang valid!');
        if (jenisTransaksi !== 'Aksesoris' && !aplikasiTransaksi) return alert('Pilih aplikasi yang digunakan!');
    
        let namaItem = '';
        let jumlahBarang = 1;
        let hargaModal = 0;
        let barangId = null;
    
        if (jenisTransaksi === 'Aksesoris') {
            if (namaItemElement.tagName === 'SELECT') {
                const selected = namaItemElement.options[namaItemElement.selectedIndex];
                barangId = selected.value;
                const nama = selected.dataset.nama;
                const stok = parseInt(selected.dataset.stok);
                const hargaBeli = parseFloat(selected.dataset.hargaBeli);
                jumlahBarang = parseInt(document.getElementById('jumlahBarang').value) || 1;
    
                if (!barangId) return alert('Pilih barang yang akan dijual!');
                if (stok < jumlahBarang) return alert(`Stok tidak cukup! Tersedia: ${stok}`);
    
                namaItem = `${nama} (${jumlahBarang}x)`;
                hargaModal = hargaBeli * jumlahBarang;
    
                // Update stok via backend (MySQL)
                await fetch('api.php?action=update_stok_barang', {
                    method: 'POST',
                    body: new URLSearchParams({ id: barangId, stok: stok - jumlahBarang }),
                    credentials: 'include'
                });
            } else {
                namaItem = namaItemElement.value;
            }
        } else {
            namaItem = namaItemElement.value;
            hargaModal = parseFloat(document.getElementById('keuntungan').value);
            if (!hargaModal || hargaModal <= 0) return alert('Masukkan harga modal yang valid!');
        }
    
        const keuntungan = uangDiterima - hargaModal;
    
        const formData = new FormData();
        formData.append('action', 'add_transaksi');
        formData.append('jenis', jenisTransaksi);
        formData.append('nama_item', namaItem);
        formData.append('nominal', uangDiterima);
        formData.append('keuntungan', keuntungan);
        formData.append('metode_pembayaran', metodePembayaran);
        formData.append('aplikasi', jenisTransaksi === 'Aksesoris' ? metodePembayaran : (aplikasiTransaksi || 'Tunai'));
        formData.append('jumlah', jumlahBarang);
    
        try {
            const res = await fetch('api.php', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
    
            const text = await res.text();
            let json;
    
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error('❌ Gagal parse JSON:', text);
                return alert('❌ Server mengirim respon tidak valid!');
            }
    
            if (!json.success) {
                return alert(json.msg || '❌ Gagal menyimpan transaksi!');
            }
    
            logActivity('transaksi', `Transaksi ${jenisTransaksi}: ${namaItem}`,
                `Nominal: Rp ${uangDiterima.toLocaleString()}, Keuntungan: Rp ${keuntungan.toLocaleString()}, Metode: ${metodePembayaran}`);
    
            // Reset form
            document.getElementById('jenisTransaksi').value = '';
            document.getElementById('itemInputContainer').innerHTML = `
                <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: Pulsa Telkomsel 50k">`;
            document.getElementById('quantityContainer').classList.add('hidden');
            document.getElementById('stokInfo').classList.add('hidden');
            document.getElementById('nominal').value = '';
            document.getElementById('keuntungan').value = '';
            document.getElementById('jumlahBarang').value = '1';
            document.getElementById('metodePembayaran').value = 'Tunai';
            document.getElementById('aplikasiTransaksi').value = 'Tunai';
            document.getElementById('saldoInfo').classList.add('hidden');
    
            // Reload data yang terpengaruh
            loadRiwayatTransaksi();
            updateTotalHariIni();
            loadSaldoData();
            if (jenisTransaksi === 'Aksesoris') loadBarangData();
    
            alert('✅ Transaksi berhasil disimpan!');
        } catch (err) {
            console.error('❌ Error kirim transaksi:', err);
            alert('❌ Terjadi kesalahan saat menyimpan transaksi.');
        }
    }
    


    // async function simpanTransaksi() {
    //     const uangDiterima = parseFloat(document.getElementById('nominal').value);
    //     const jenisTransaksi = document.getElementById('jenisTransaksi').value;
    //     const namaItemElement = document.getElementById('namaItem');
    //     const metodePembayaran = document.getElementById('metodePembayaran').value;
    //     const aplikasiTransaksi = document.getElementById('aplikasiTransaksi').value;
    
    //     // Validasi awal
    //     if (!jenisTransaksi) return alert('Pilih jenis transaksi!');
    //     if (!namaItemElement.value) return alert('Masukkan nama item/layanan!');
    //     if (!uangDiterima || uangDiterima <= 0) return alert('Masukkan nominal yang valid!');
    //     if (jenisTransaksi !== 'Aksesoris' && !aplikasiTransaksi) return alert('Pilih aplikasi yang digunakan!');
    
    //     let namaItem = '';
    //     let jumlahBarang = 1;
    //     let barangId = null;
    //     let hargaModal = 0;
    
    //     // 🛒 Penanganan transaksi Aksesoris
    //     if (jenisTransaksi === 'Aksesoris') {
    //         if (namaItemElement.tagName === 'SELECT') {
    //             const selectedOption = namaItemElement.options[namaItemElement.selectedIndex];
    //             if (!selectedOption.value) return alert('Pilih barang yang akan dijual!');
    
    //             barangId = parseInt(selectedOption.value);
    //             jumlahBarang = parseInt(document.getElementById('jumlahBarang').value) || 1;
    //             const stok = parseInt(selectedOption.dataset.stok);
    //             const namaBarang = selectedOption.dataset.nama;
    //             const hargaBeli = parseFloat(selectedOption.dataset.hargaBeli);
    
    //             if (stok < jumlahBarang) return alert(`Stok tidak mencukupi! Tersedia: ${stok}`);
    
    //             // Nama item dan harga modal dihitung otomatis
    //             namaItem = `${namaBarang} (${jumlahBarang}x)`;
    //             hargaModal = hargaBeli * jumlahBarang;
    
    //             // Kurangi stok barang
    //             await fetch('api.php?action=update_stok_barang', {
    //                 method: 'POST',
    //                 body: new URLSearchParams({ id: barangId, stok: stok - jumlahBarang }),
    //                 credentials: 'include'
    //             });
    //         } else {
    //             namaItem = namaItemElement.value;
    //         }
    //     } else {
    //         // Transaksi non-aksesoris → harga modal manual
    //         namaItem = namaItemElement.value;
    //         hargaModal = parseFloat(document.getElementById('keuntungan').value);
    //         if (!hargaModal || hargaModal <= 0) return alert('Masukkan harga modal yang valid!');
    //     }
    
    //     // Hitung keuntungan
    //     const keuntungan = uangDiterima - hargaModal;
    
    //     // Siapkan data untuk dikirim
    //     const fd = new FormData();
    //     fd.append('jenis', jenisTransaksi);
    //     fd.append('nama_item', namaItem);
    //     fd.append('nominal', uangDiterima);
    //     fd.append('keuntungan', keuntungan);
    //     fd.append('metode_pembayaran', metodePembayaran);
    //     fd.append('aplikasi', jenisTransaksi === 'Aksesoris' ? metodePembayaran : (aplikasiTransaksi || 'Tunai'));
    //     fd.append('jumlah', jumlahBarang);
    
    //     try {
    //         const res = await fetch('api.php?action=add_transaksi', {
    //             method: 'POST',
    //             body: fd,
    //             credentials: 'include'
    //         });
    
    //         const rawText = await res.text();
    //         let json;
    //         try {
    //             json = JSON.parse(rawText);
    //         } catch (e) {
    //             console.error("❌ Gagal parse JSON:", rawText);
    //             alert("❌ Terjadi kesalahan di server saat menyimpan transaksi.");
    //             return;
    //         }
    
    //         if (!json.success) {
    //             alert(json.msg || 'Gagal menyimpan transaksi ke database!');
    //             return;
    //         }
    
    //         // ✅ Log aktivitas
    //         logActivity('Transaksi', `Transaksi ${jenisTransaksi}: ${namaItem}`,
    //             `Nominal: Rp ${uangDiterima.toLocaleString()}, Keuntungan: Rp ${keuntungan.toLocaleString()}, Metode: ${metodePembayaran}`);
    
    //         // 🔄 Reset form
    //         document.getElementById('jenisTransaksi').value = '';
    //         document.getElementById('itemInputContainer').innerHTML = `
    //             <input type="text" id="namaItem" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary" placeholder="Contoh: Pulsa Telkomsel 50k">`;
    //         document.getElementById('quantityContainer').classList.add('hidden');
    //         document.getElementById('stokInfo').classList.add('hidden');
    //         document.getElementById('nominal').value = '';
    //         document.getElementById('keuntungan').value = '';
    //         document.getElementById('jumlahBarang').value = '1';
    //         document.getElementById('metodePembayaran').value = 'Tunai';
    //         document.getElementById('aplikasiTransaksi').value = 'Tunai';
    //         document.getElementById('saldoInfo').classList.add('hidden');
    
    //         // 🔄 Refresh data
    //         loadRiwayatTransaksi();
    //         updateTotalHariIni();
    //         loadSaldoData();
    //         if (jenisTransaksi === 'Aksesoris') loadBarangData();
    
    //         alert('✅ Transaksi berhasil disimpan!');
    //     } catch (err) {
    //         console.error("❌ Error simpanTransaksi:", err);
    //         alert('❌ Terjadi kesalahan saat menyimpan transaksi.');
    //     }
    // }
    
    
    
    //sudah

// ✅ Simpan saldo harian ke database
    async function simpanSaldo() {
        if (currentUserRole !== 'admin') {
            alert('Hanya administrator yang dapat mengubah saldo!');
            return;
        }

        let tanggal = document.getElementById('tanggalSaldo').value;
        if (!tanggal) {
            alert('Pilih tanggal terlebih dahulu!');
            return;
        }

        const aplikasiList = [
            'Brimo', 'Dana', 'Gopay', 'VSSTORE', 'RITA', 'VIVAapps',
            'Digipos', 'Simpel', 'SiDompul', 'SeaBank', 'Tunai'
        ];

        let totalSaldoInput = 0;
        let successCount = 0;
        let failedList = [];

        for (let nama of aplikasiList) {
            const el = document.getElementById('saldo' + nama);
            if (!el) continue;

            const saldo = parseFloat(el.value);
            if (isNaN(saldo) || saldo < 0) {
                console.warn(`Saldo ${nama} tidak valid`);
                continue;
            }

            totalSaldoInput += saldo;

            const fd = new FormData();
            fd.append('tanggal', tanggal);
            fd.append('aplikasi', nama);
            fd.append('saldo', saldo);

            try {
                const res = await fetch('api.php?action=update_saldo', {
                    method: 'POST',
                    body: fd,
                    credentials: 'include'
                });
                const json = await res.json();

                if (json.success) {
                    successCount++;
                } else {
                    failedList.push(`${nama} (${json.msg || 'gagal'})`);
                }
            } catch (err) {
                failedList.push(`${nama} (fetch error)`);
            }
        }

        // Catat aktivitas (hanya jika ada saldo tersimpan)
        if (successCount > 0) {
            logActivity('saldo', `Update saldo harian tanggal ${tanggal}`, `Total saldo: Rp ${totalSaldoInput.toLocaleString()}`);
        }

        // Reset form
        for (let nama of aplikasiList) {
            const el = document.getElementById('saldo' + nama);
            if (el) el.value = '';
        }

        loadSaldoData();

        if (failedList.length === 0) {
            alert(`✅ Semua saldo berhasil disimpan (${successCount} aplikasi).`);
        } else {
            alert(`⚠️ ${successCount} saldo berhasil.\n❌ Gagal untuk: ${failedList.join(', ')}`);
        }
    }





    
    
    
    //sudah

    // Simpan barang
    // Simpan barang baru ke MySQL
    async function simpanBarang() {
        const nama = document.getElementById('namaBarang').value.trim();
        const hargaBeli = parseFloat(document.getElementById('hargaBeli').value);
        const hargaJual = parseFloat(document.getElementById('hargaJual').value);
        const stok = parseInt(document.getElementById('stokBarang').value);
    
        // Validasi input
        if (!nama || isNaN(hargaBeli) || isNaN(hargaJual) || isNaN(stok)) {
            alert('Lengkapi semua data barang dengan benar!');
            return;
        }
    
        // Kirim data ke backend
        const fd = new FormData();
        fd.append('nama', nama);
        fd.append('harga_beli', hargaBeli);
        fd.append('harga_jual', hargaJual);
        fd.append('stok', stok);
    
        try {
            const res = await fetch('api.php?action=add_barang', {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });
    
            const json = await res.json();
    
            if (!json.success) {
                alert(json.msg || '❌ Gagal menambahkan barang ke database!');
                return;
            }
    
            // Log aktivitas ke backend
            logActivity(
                'edit_barang',
                `Tambah barang baru: ${nama}`,
                `Harga beli: Rp ${hargaBeli.toLocaleString()}, Harga jual: Rp ${hargaJual.toLocaleString()}, Stok: ${stok}`
            );
    
            // Reset form dan sembunyikan
            document.getElementById('namaBarang').value = '';
            document.getElementById('hargaBeli').value = '';
            document.getElementById('hargaJual').value = '';
            document.getElementById('stokBarang').value = '';
            document.getElementById('addBarangForm').classList.add('hidden');
    
            // Perbarui daftar barang dari database
            await loadBarangData();
    
            alert('✅ Barang berhasil ditambahkan ke database!');
        } catch (err) {
            console.error('❌ Error saat menyimpan barang:', err);
            alert('❌ Gagal menghubungi server!');
        }
    }
    

    // Load dashboard data (MySQL)
    function loadDashboard() {
        loadRiwayatTransaksi(); // Ambil transaksi terbaru dari MySQL
        updateTotalHariIni();   // Hitung total hari ini dari MySQL
    }
//sudah

    // Load riwayat transaksi hari ini dari MySQL
    async function loadRiwayatTransaksi() {
        const container = document.getElementById('riwayatTransaksi');
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Memuat...</p>';
    
        try {
            const res = await fetch('api.php?action=get_transaksi', { credentials: 'include' });
            const data = await res.json();
    
            // ✅ Mapping ke struktur yang konsisten
            transaksiData = Array.isArray(data) ? data.map(t => ({
                id: t.id,
                tanggal: t.tanggal,
                jenis: t.jenis || '-',
                namaItem: t.nama_item || t.namaItem || '-',           // fallback
                nominal: parseFloat(t.nominal || 0),
                keuntungan: parseFloat(t.keuntungan || 0),
                pembayaran: t.metode_pembayaran || t.pembayaran || '-', // fallback
                saldoDigunakan: t.aplikasi || '-',                      // fallback
                jumlah: parseInt(t.jumlah || 1),
                user: t.kasir || t.user || 'System'
            })) : [];
    
            // ✅ Filter transaksi hari ini
            const today = new Date().toISOString().split('T')[0];
            const todayTransaksi = transaksiData.filter(t => t.tanggal.startsWith(today));
    
            container.innerHTML = '';
    
            if (todayTransaksi.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada transaksi hari ini</p>';
                return;
            }
    
            todayTransaksi.forEach(transaksi => {
                const div = document.createElement('div');
                div.className = 'bg-gray-50 rounded-lg p-4';
    
                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <h4 class="font-semibold text-gray-800">${transaksi.namaItem}</h4>
                            <p class="text-sm text-gray-600">
                                ${transaksi.jenis} • ${transaksi.pembayaran}${transaksi.saldoDigunakan && transaksi.saldoDigunakan !== 'Tunai' ? ' • ' + transaksi.saldoDigunakan : ''}
                            </p>
                            <p class="text-xs text-gray-500">
                                ${new Date(transaksi.tanggal).toLocaleTimeString('id-ID')} • ${transaksi.user}
                            </p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-primary">Rp ${transaksi.nominal.toLocaleString('id-ID')}</p>
                            <p class="text-sm text-green-600">+Rp ${transaksi.keuntungan.toLocaleString('id-ID')}</p>
                        </div>
                    </div>
                `;
                container.appendChild(div);
            });
        } catch (err) {
            console.error('❌ Gagal memuat transaksi:', err);
            container.innerHTML = '<p class="text-red-500 text-center py-4">Gagal memuat transaksi</p>';
            transaksiData = [];
        }
    }
    

    // Update total transaksi & keuntungan hari ini dari MySQL
    async function updateTotalHariIni() {
        const res = await fetch('api.php?action=get_transaksi', {credentials: 'include'});
        const transaksiData = await res.json();

        // Filter transaksi hari ini
        const today = new Date().toISOString().split('T')[0];
        const todayTransaksi = transaksiData.filter(t => t.tanggal.startsWith(today));

        const totalNominal = todayTransaksi.reduce((sum, t) => sum + parseFloat(t.nominal), 0);
        const totalKeuntungan = todayTransaksi.reduce((sum, t) => sum + parseFloat(t.keuntungan), 0);

        document.getElementById('totalHariIni').textContent = `Rp ${totalNominal.toLocaleString()}`;
        document.getElementById('totalKeuntungan').textContent = `Rp ${totalKeuntungan.toLocaleString()}`;
    }

    // Show add barang form
    function showAddBarangForm() {
        const form = document.getElementById('addBarangForm');
        form.classList.toggle('hidden');
    }
//sudah

    // Load saldo data
    // async function loadSaldoData() {
    //     const today = new Date().toISOString().split('T')[0];
    //     const container = document.getElementById('currentSaldoDisplay');
    //     container.innerHTML = '';
    
    //     let saldoArray = [];
    //     try {
    //         const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
    //         saldoArray = await res.json();
    //     } catch (error) {
    //         console.error('❌ Gagal load saldo:', error);
    //         alert('Gagal memuat data saldo dari server.');
    //         return;
    //     }
    
    //     // Map saldo berdasarkan aplikasi
    //     const todaySaldo = {};
    //     saldoArray.forEach(s => {
    //         if (s.tanggal === today) {
    //             todaySaldo[s.aplikasi] = parseFloat(s.saldo);
    //         }
    //     });
    
    //     const aplikasiList = [
    //         { key: 'Tunai', label: '💵 Tunai (Cash)' },
    //         { key: 'Brimo', label: '🏦 Brimo (BRI Mobile)' },
    //         { key: 'Dana', label: '📱 Dana' },
    //         { key: 'Gopay', label: '📱 Gopay' },
    //         { key: 'VSSTORE', label: '🛒 VSSTORE' },
    //         { key: 'RITA', label: '🏪 RITA' },
    //         { key: 'VIVAapps', label: '📲 VIVAapps' },
    //         { key: 'Digipos', label: '📲 Digipos' },
    //         { key: 'Simpel', label: '📲 Simpel' },
    //         { key: 'SiDompul', label: '📲 SiDompul' },
    //         { key: 'SeaBank', label: '🏦 SeaBank' }
    //     ];
    
    //     let total = 0;
    
    //     aplikasiList.forEach(app => {
    //         const nominal = todaySaldo[app.key] || 0;
    //         total += nominal;
    
    //         const el = document.createElement('div');
    //         el.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
    //         el.innerHTML = `
    //             <div class="flex items-center space-x-3">
    //                 <span class="font-medium text-gray-700">${app.label}</span>
    //             </div>
    //             <span class="font-bold ${nominal > 0 ? 'text-green-600' : 'text-gray-400'}">
    //                 Rp ${nominal.toLocaleString()}
    //             </span>
    //         `;
    //         container.appendChild(el);
    //     });
    
    //     document.getElementById('totalSaldo').textContent = `Rp ${total.toLocaleString()}`;
    // }

    async function loadSaldoData() {
        const today = new Date().toISOString().split('T')[0];
        const container = document.getElementById('currentSaldoDisplay');
        container.innerHTML = '';
    
        let todaySaldo = {};
        try {
            const res = await fetch('api.php?action=get_saldo&tanggal=' + today, { credentials: 'include' });
            const json = await res.json();
    
            if (!json.success || typeof json.data !== 'object') {
                console.error('❌ Data saldo tidak valid:', json);
                alert('Gagal memuat data saldo dari server.');
                return;
            }
    
            todaySaldo = json.data; // ✅ bentuknya { "Tunai": 1000, "Brimo": 0, ... }
        } catch (error) {
            console.error('❌ Gagal load saldo:', error);
            alert('Gagal memuat data saldo dari server.');
            return;
        }
    
        const aplikasiList = [
            { key: 'Tunai', label: '💵 Tunai (Cash)' },
            { key: 'Brimo', label: '🏦 Brimo (BRI Mobile)' },
            { key: 'Dana', label: '📱 Dana' },
            { key: 'Gopay', label: '📱 Gopay' },
            { key: 'VSSTORE', label: '🛒 VSSTORE' },
            { key: 'RITA', label: '🏪 RITA' },
            { key: 'VIVAapps', label: '📲 VIVAapps' },
            { key: 'Digipos', label: '📲 Digipos' },
            { key: 'Simpel', label: '📲 Simpel' },
            { key: 'SiDompul', label: '📲 SiDompul' },
            { key: 'SeaBank', label: '🏦 SeaBank' }
        ];
    
        let total = 0;
    
        aplikasiList.forEach(app => {
            const nominal = parseFloat(todaySaldo[app.key] || 0);
            total += nominal;
    
            const el = document.createElement('div');
            el.className = 'flex justify-between items-center p-3 bg-gray-50 rounded-lg';
            el.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="font-medium text-gray-700">${app.label}</span>
                </div>
                <span class="font-bold ${nominal > 0 ? 'text-green-600' : 'text-gray-400'}">
                    Rp ${nominal.toLocaleString()}
                </span>
            `;
            container.appendChild(el);
        });
    
        document.getElementById('totalSaldo').textContent = `Rp ${total.toLocaleString()}`;
    }
    
    
    
    

//done
    // Update barang summary
    // Update summary barang dari MySQL
    function updateBarangSummary(barangData) {
        if (!barangData || !Array.isArray(barangData)) return;
    
        // Total jenis barang
        document.getElementById('totalJenisBarang').textContent = barangData.length;
    
        // Total stok
        const totalStok = barangData.reduce((sum, b) => sum + parseInt(b.stok), 0);
        document.getElementById('totalStokBarang').textContent = totalStok;
    
        // Total modal
        const totalModal = barangData.reduce((sum, b) => sum + (parseFloat(b.harga_beli) * parseInt(b.stok)), 0);
        document.getElementById('totalModalBarang').textContent = `Rp ${totalModal.toLocaleString()}`;
    
        // Potensi keuntungan
        const potensiKeuntungan = barangData.reduce((sum, b) => {
            return sum + ((parseFloat(b.harga_jual) - parseFloat(b.harga_beli)) * parseInt(b.stok));
        }, 0);
        document.getElementById('potensiKeuntunganBarang').textContent = `Rp ${potensiKeuntungan.toLocaleString()}`;
    
        // Barang stok menipis
        const barangMenipis = barangData.filter(b => parseInt(b.stok) > 0 && parseInt(b.stok) <= 5);
        document.getElementById('barangStokMenipis').textContent = barangMenipis.length;
        document.getElementById('listStokMenipis').innerHTML = barangMenipis.length > 0
            ? barangMenipis.map(b => `<div class="mb-1">• ${b.nama} (${b.stok} unit)</div>`).join('')
            : '<div class="text-green-600">✅ Semua barang stok aman</div>';
    
        // Barang stok habis
        const barangHabis = barangData.filter(b => parseInt(b.stok) === 0);
        document.getElementById('barangStokHabis').textContent = barangHabis.length;
        document.getElementById('listStokHabis').innerHTML = barangHabis.length > 0
            ? barangHabis.map(b => `<div class="mb-1">• ${b.nama}</div>`).join('')
            : '<div class="text-green-600">✅ Tidak ada barang stok habis</div>';
    
        // Rata-rata margin
        const rataRataMargin = barangData.length > 0
            ? (barangData.reduce((sum, b) => {
                const margin = ((parseFloat(b.harga_jual) - parseFloat(b.harga_beli)) / parseFloat(b.harga_beli)) * 100;
                return sum + margin;
            }, 0) / barangData.length).toFixed(1)
            : 0;
    
        document.getElementById('rataRataMargin').textContent = `${rataRataMargin}%`;
    }
    
    
    

    // Load barang data dari MySQL dan render tabel
    async function loadBarangData() {
        try {
            const res = await fetch('api.php?action=get_barang', { credentials: 'include' });
            const barangData = await res.json();
    
            const tbody = document.getElementById('barangTableBody');
            tbody.innerHTML = '';
    
            barangData.forEach(barang => {
                const tr = document.createElement('tr');
                tr.className = 'border-b hover:bg-gray-50';
    
                const hargaBeli = parseFloat(barang.harga_beli);
                const hargaJual = parseFloat(barang.harga_jual);
                const stok = parseInt(barang.stok);
    
                const marginPercent = ((hargaJual - hargaBeli) / hargaBeli * 100).toFixed(1);
                const keuntunganPerItem = hargaJual - hargaBeli;
                const nilaiStok = hargaBeli * stok;
    
                let stokClass = 'text-gray-900';
                let stokIcon = '';
                if (stok === 0) {
                    stokClass = 'text-red-600 font-bold';
                    stokIcon = '❌ ';
                } else if (stok <= 5) {
                    stokClass = 'text-yellow-600 font-bold';
                    stokIcon = '⚠️ ';
                } else {
                    stokClass = 'text-green-600';
                    stokIcon = '✅ ';
                }
    
                tr.innerHTML = `
                    <td class="px-4 py-3">
                        <div class="font-medium">${barang.nama}</div>
                        <div class="text-xs text-gray-500">Margin: ${marginPercent}% • Keuntungan: Rp ${keuntunganPerItem.toLocaleString()}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div>Rp ${hargaBeli.toLocaleString()}</div>
                        <div class="text-xs text-gray-500">Nilai stok: Rp ${nilaiStok.toLocaleString()}</div>
                    </td>
                    <td class="px-4 py-3">Rp ${hargaJual.toLocaleString()}</td>
                    <td class="px-4 py-3">
                        <span class="${stokClass}">${stokIcon}${stok}</span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="flex space-x-2">
                            <button onclick="viewBarang(${barang.id})" class="text-blue-600 hover:text-blue-800 text-sm px-2 py-1 rounded border border-blue-300 hover:bg-blue-50">
                                👁️ Lihat
                            </button>
                            <button onclick="editBarang(${barang.id})" class="text-green-600 hover:text-green-800 text-sm px-2 py-1 rounded border border-green-300 hover:bg-green-50">
                                ✏️ Edit
                            </button>
                            <button onclick="addStokBarang(${barang.id})" class="text-purple-600 hover:text-purple-800 text-sm px-2 py-1 rounded border border-purple-300 hover:bg-purple-50">
                                📦 +Stok
                            </button>
                            <button onclick="deleteBarang(${barang.id})" class="text-red-600 hover:text-red-800 text-sm px-2 py-1 rounded border border-red-300 hover:bg-red-50">
                                🗑️ Hapus
                            </button>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
    
            // Panggil update summary setelah tampilkan data
            updateBarangSummary(barangData);
    
        } catch (err) {
            console.error('❌ Gagal memuat data barang:', err);
            alert('Gagal memuat data barang dari server.');
        }
    }
    
    
//done

    // Hapus barang dari MySQL
    async function deleteBarang(id) {
        if (!confirm('Yakin ingin menghapus barang ini?')) return;

        // Ambil nama barang sebelum dihapus untuk log
        const resDetail = await fetch(`api.php?action=get_barang&id=${id}`, {credentials:'include'});
        const barang = await resDetail.json();
        const namaBarang = barang && barang.nama ? barang.nama : 'Unknown';

        // Panggil API untuk hapus barang
        const fd = new FormData();
        fd.append('id', id);
        const res = await fetch('api.php?action=delete_barang', {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const json = await res.json();

        if (json.success) {
            // Log aktivitas ke MySQL
            logActivity('Barang', `Hapus barang: ${namaBarang}`, 'Barang dihapus dari database');

            // Refresh tabel barang
            loadBarangData();
            alert('Barang berhasil dihapus dari database!');
        } else {
            alert('Gagal menghapus barang dari database!');
        }
    }

    // Lihat detail barang dari MySQL
    async function viewBarang(id) {
        const res = await fetch(`api.php?action=get_barang&id=${id}`, {credentials:'include'});
        const barang = await res.json();

        if (!barang || !barang.id) {
            alert('Barang tidak ditemukan!');
            return;
        }

        const hargaBeli = parseFloat(barang.harga_beli);
        const hargaJual = parseFloat(barang.harga_jual);
        const stok = parseInt(barang.stok);

        const keuntunganPerItem = hargaJual - hargaBeli;
        const persentaseKeuntungan = ((keuntunganPerItem / hargaBeli) * 100).toFixed(1);
        const totalNilaiStok = stok * hargaBeli;
        const potensiKeuntungan = stok * keuntunganPerItem;

        document.getElementById('viewBarangContent').innerHTML = `
            <div class="bg-gray-50 rounded-lg p-4">
                <h4 class="font-bold text-lg text-gray-800 mb-3">${barang.nama}</h4>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Harga Beli</p>
                        <p class="font-semibold text-gray-800">Rp ${hargaBeli.toLocaleString()}</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Harga Jual</p>
                        <p class="font-semibold text-green-600">Rp ${hargaJual.toLocaleString()}</p>
                    </div>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <p class="text-sm text-gray-600">Stok Tersedia</p>
                        <p class="font-semibold ${stok > 0 ? 'text-blue-600' : 'text-red-600'}">${stok} unit</p>
                    </div>
                    <div>
                        <p class="text-sm text-gray-600">Keuntungan/Item</p>
                        <p class="font-semibold text-green-600">Rp ${keuntunganPerItem.toLocaleString()} (${persentaseKeuntungan}%)</p>
                    </div>
                </div>
                
                <div class="border-t pt-3">
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <p class="text-sm text-gray-600">Total Nilai Stok</p>
                            <p class="font-semibold text-purple-600">Rp ${totalNilaiStok.toLocaleString()}</p>
                        </div>
                        <div>
                            <p class="text-sm text-gray-600">Potensi Keuntungan</p>
                            <p class="font-semibold text-green-600">Rp ${potensiKeuntungan.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
                
                <div class="mt-3 pt-3 border-t">
                    <p class="text-xs text-gray-500">
                        ${stok <= 0 
                            ? '❌ Stok habis! Segera lakukan restok.' 
                            : stok <= 5 
                            ? '⚠️ Stok menipis! Pertimbangkan untuk menambah stok.' 
                            : '✅ Stok dalam kondisi baik.'}
                    </p>
                </div>
            </div>
        `;
        
        document.getElementById('viewBarangModal').classList.remove('hidden');
    }

    function closeViewBarangModal() {
        document.getElementById('viewBarangModal').classList.add('hidden');
    }

   // Tampilkan modal edit barang dari MySQL
    async function editBarang(id) {
        const res = await fetch(`api.php?action=get_barang&id=${id}`, {credentials:'include'});
        const barang = await res.json();

        if (!barang || !barang.id) {
            alert('Barang tidak ditemukan di database!');
            return;
        }

        document.getElementById('editBarangId').value = barang.id;
        document.getElementById('editNamaBarang').value = barang.nama;
        document.getElementById('editHargaBeli').value = barang.harga_beli;
        document.getElementById('editHargaJual').value = barang.harga_jual;
        document.getElementById('editStokBarang').value = barang.stok;
        
        document.getElementById('editBarangModal').classList.remove('hidden');
    }

    function closeEditBarangModal() {
        document.getElementById('editBarangModal').classList.add('hidden');
    }

    // Update barang di MySQL
    async function updateBarang() {
        const id = parseInt(document.getElementById('editBarangId').value);
        const nama = document.getElementById('editNamaBarang').value.trim();
        const hargaBeli = parseFloat(document.getElementById('editHargaBeli').value);
        const hargaJual = parseFloat(document.getElementById('editHargaJual').value);
        const stok = parseInt(document.getElementById('editStokBarang').value);

        if (!nama || !hargaBeli || !hargaJual || stok < 0) {
            alert('Lengkapi semua data dengan benar!');
            return;
        }

        if (hargaJual <= hargaBeli) {
            alert('Harga jual harus lebih tinggi dari harga beli!');
            return;
        }

        const fd = new FormData();
        fd.append('id', id);
        fd.append('nama', nama);
        fd.append('harga_beli', hargaBeli);
        fd.append('harga_jual', hargaJual);
        fd.append('stok', stok);
      

        const res = await fetch('api.php?action=update_barang', {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const json = await res.json();

        if (json.success) {
            // Log aktivitas ke MySQL
            logActivity('Barang', `Edit barang: ${nama}`, 
                `Harga beli: Rp ${hargaBeli.toLocaleString()}, Harga jual: Rp ${hargaJual.toLocaleString()}, Stok: ${stok}`);

            loadBarangData();
            closeEditBarangModal();
            alert('Data barang berhasil diperbarui di database!');
        } else {
            alert('Gagal memperbarui data barang di database!');
        }
    }

//done
   // Tampilkan modal tambah stok dari MySQL
    async function addStokBarang(id) {
        const res = await fetch(`api.php?action=get_barang&id=${id}`, {credentials:'include'});
        const barang = await res.json();

        if (!barang || !barang.id) {
            alert('Barang tidak ditemukan di database!');
            return;
        }

        document.getElementById('addStokBarangId').value = barang.id;
        document.getElementById('addStokNamaBarang').value = barang.nama;
        document.getElementById('addStokCurrent').value = barang.stok;
        document.getElementById('addStokJumlah').value = '';
        document.getElementById('addStokHargaBeli').value = barang.harga_beli;
        document.getElementById('addStokTotalBiaya').value = '';
        document.getElementById('addStokMetodePembayaran').value = 'Tunai';
        document.getElementById('addStokSupplier').value = '';
        document.getElementById('addStokCatatan').value = '';
        document.getElementById('saldoInfoAddStok').classList.add('hidden');
        
        document.getElementById('addStokModal').classList.remove('hidden');
    }

    function closeAddStokModal() {
        document.getElementById('addStokModal').classList.add('hidden');
    }

    // Update total biaya stok (real-time)
    function updateTotalBiayaStok() {
        const jumlah = parseFloat(document.getElementById('addStokJumlah').value) || 0;
        const harga = parseFloat(document.getElementById('addStokHargaBeli').value) || 0;
        const total = jumlah * harga;
        document.getElementById('addStokTotalBiaya').value = total;
    }

    // Check saldo MySQL untuk add stok
    async function checkSaldoAddStok() {
        const metode = document.getElementById('addStokMetodePembayaran').value;
        const saldoInfo = document.getElementById('saldoInfoAddStok');
        const saldoTersedia = document.getElementById('saldoTersediaAddStok');

        if (!metode) {
            saldoInfo.classList.add('hidden');
            return;
        }

        const res = await fetch('api.php?action=get_saldo', {credentials:'include'});
        const saldoData = await res.json();
        const today = new Date().toISOString().split('T')[0];
        const todaySaldo = saldoData.find(s => s.tanggal === today && s.aplikasi === metode);
        const saldo = todaySaldo ? parseFloat(todaySaldo.saldo) : 0;

        saldoTersedia.textContent = `Rp ${saldo.toLocaleString()}`;
        saldoInfo.classList.remove('hidden');
        saldoTersedia.className = saldo > 0 ? 'font-semibold text-green-600' : 'font-semibold text-red-600';
    }

    // Simpan penambahan stok ke MySQL
    async function simpanAddStok() {
        const id = parseInt(document.getElementById('addStokBarangId').value);
        const jumlah = parseInt(document.getElementById('addStokJumlah').value);
        const hargaBeli = parseFloat(document.getElementById('addStokHargaBeli').value);
        const totalBiaya = parseFloat(document.getElementById('addStokTotalBiaya').value);
        const metodePembayaran = document.getElementById('addStokMetodePembayaran').value;
        const supplier = document.getElementById('addStokSupplier').value.trim();
        const catatan = document.getElementById('addStokCatatan').value.trim();

        if (!jumlah || jumlah <= 0 || !hargaBeli || !totalBiaya) {
            alert('Lengkapi jumlah dan harga beli!');
            return;
        }

        const fd = new FormData();
        fd.append('id', id);
        fd.append('jumlah', jumlah);
        fd.append('harga_beli', hargaBeli);
        fd.append('total_biaya', totalBiaya);
        fd.append('metode_pembayaran', metodePembayaran);
        fd.append('supplier', supplier);
        fd.append('catatan', catatan);

        const res = await fetch('api.php?action=add_stok', {
            method: 'POST',
            body: fd,
            credentials: 'include'
        });
        const json = await res.json();

        if (json.success) {
            logActivity('Stok', `Tambah stok ${jumlah} unit untuk barang ID ${id}`, 
                `Biaya: Rp ${totalBiaya.toLocaleString()} via ${metodePembayaran}`);

            closeAddStokModal();
            loadBarangData();
            loadSaldoData();
            alert('Stok berhasil ditambahkan ke database!');
        } else {
            alert('Gagal menambahkan stok!');
        }
    }
//done

    async function saveAddStok() {
        const id = parseInt(document.getElementById('addStokBarangId').value);
        const jumlahTambah = parseInt(document.getElementById('addStokJumlah').value);
        const hargaBeli = parseFloat(document.getElementById('addStokHargaBeli').value);
        const totalBiaya = parseFloat(document.getElementById('addStokTotalBiaya').value);
        const metodePembayaran = document.getElementById('addStokMetodePembayaran').value;
        const supplier = document.getElementById('addStokSupplier').value.trim();
        const catatan = document.getElementById('addStokCatatan').value.trim();

        if (!jumlahTambah || jumlahTambah <= 0) {
            alert('Masukkan jumlah stok yang valid!');
            return;
        }
        if (!hargaBeli || hargaBeli <= 0) {
            alert('Masukkan harga beli yang valid!');
            return;
        }
        if (!supplier) {
            alert('Masukkan nama supplier/toko!');
            return;
        }

        try {
            // Ambil saldo dari API
            const resSaldo = await fetch('api.php?action=get_saldo', { credentials: 'include' });
            const jsonSaldo = await resSaldo.json();

            if (!jsonSaldo.success || typeof jsonSaldo.data !== 'object') {
                throw new Error('Format saldo tidak valid');
            }

            const currentSaldo = parseFloat(jsonSaldo.data[metodePembayaran]) || 0;

            if (currentSaldo < totalBiaya) {
                alert(`Saldo ${metodePembayaran} tidak mencukupi!\nSaldo saat ini: Rp ${currentSaldo.toLocaleString()}\nDibutuhkan: Rp ${totalBiaya.toLocaleString()}`);
                return;
            }

            // Kirim data stok ke backend
            const fd = new FormData();
            fd.append('id', id);
            fd.append('jumlah', jumlahTambah);
            fd.append('harga_beli', hargaBeli);
            fd.append('total_biaya', totalBiaya);
            fd.append('metode_pembayaran', metodePembayaran);
            fd.append('supplier', supplier);
            fd.append('catatan', `Penambahan stok - ${catatan}`);

            const res = await fetch('api.php?action=add_stok', {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });

            const text = await res.text(); // ambil respon sebagai teks mentah

            let json;
            try {
                json = JSON.parse(text); // coba parse JSON
            } catch (e) {
                console.error("❌ Error saat parsing JSON:", text); // tampilkan isi respon error
                throw new Error("Format respon dari server bukan JSON");
            }

            if (json.success) {
                logActivity('stok', `Tambah stok ID ${id}`, 
                    `Tambah ${jumlahTambah} unit, Biaya: Rp ${totalBiaya.toLocaleString()}, Supplier: ${supplier}, Metode: ${metodePembayaran}`);

                loadBarangData();
                loadSaldoData();
                closeAddStokModal();
                alert(`Stok berhasil ditambah!\nJumlah: ${jumlahTambah} unit\nTotal biaya: Rp ${totalBiaya.toLocaleString()}\nSaldo ${metodePembayaran} berkurang.`);
            } else {
                alert('Gagal menambah stok di database!\n' + (json.msg || ''));
            }

        } catch (err) {
            console.error('❌ Error saat memproses saldo atau simpan stok:', err);
            alert('Terjadi kesalahan saat menyimpan stok!');
        }
    }


//done

    // Load laporan data dari MySQL
    async function loadLaporanData() {
        let url = 'api.php?action=get_transaksi';
        if (currentUserRole === 'kasir') {
            url += `&user=${encodeURIComponent(currentUser)}`;
        }

        const res = await fetch(url, {credentials:'include'});
        const data = await res.json();
        transaksiData = data; // simpan ke array global

        // Hitung total
        const totalPenjualan = data.reduce((sum, t) => sum + parseFloat(t.nominal), 0);
        const totalKeuntungan = data.reduce((sum, t) => sum + parseFloat(t.keuntungan), 0);
        const totalTransaksi = data.length;

        document.getElementById('totalPenjualan').textContent = `Rp ${totalPenjualan.toLocaleString()}`;
        document.getElementById('totalKeuntunganLaporan').textContent = `Rp ${totalKeuntungan.toLocaleString()}`;
        document.getElementById('totalTransaksi').textContent = totalTransaksi;

        loadLaporanTable();
    }

    // Load laporan table dari MySQL
    function loadLaporanTable() {
        const tbody = document.getElementById('laporanTableBody');
        tbody.innerHTML = '';
    
        let filteredData = transaksiData;
        if (currentUserRole === 'kasir') {
            filteredData = transaksiData.filter(t => t.user === currentUser);
        }
    
        if (filteredData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="px-4 py-8 text-center text-gray-500">Belum ada data transaksi</td></tr>';
            return;
        }
    
        filteredData.forEach(transaksi => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
            
            // Format tanggal & jam
            const tanggalObj = new Date(transaksi.tanggal);
            const tanggalFormatted = tanggalObj.toLocaleDateString('id-ID');
            const jamFormatted = tanggalObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    
            // Fallback agar tidak undefined
            const namaItem = transaksi.namaItem || transaksi.nama_item || '-';
            const metode = transaksi.metodePembayaran || transaksi.metode_pembayaran || 'Tunai';
            const aplikasi = transaksi.aplikasi || 'Tunai';
            const userDisplay = transaksi.user || transaksi.username || 'System';
    
            const nominal = parseFloat(transaksi.nominal || 0);
            const keuntungan = parseFloat(transaksi.keuntungan || 0);
    
            // Hitung saldo digunakan
            let saldoDigunakan = '';
            if (transaksi.jenis === 'Aksesoris') {
                saldoDigunakan = `${metode}: +Rp ${nominal.toLocaleString()}`;
            } else if (transaksi.jenis === 'Tarik Tunai') {
                saldoDigunakan = `${metode}: +Rp ${nominal.toLocaleString()}<br>Tunai: -Rp ${(nominal - keuntungan).toLocaleString()}`;
            } else {
                const hargaModal = nominal - keuntungan;
                saldoDigunakan = `${metode}: +Rp ${nominal.toLocaleString()}`;
                if (aplikasi && aplikasi !== 'Tunai') {
                    saldoDigunakan += `<br>${aplikasi}: -Rp ${hargaModal.toLocaleString()}`;
                } else {
                    saldoDigunakan += `<br>Tunai: -Rp ${hargaModal.toLocaleString()}`;
                }
            }
    
            // Isi baris tabel
            tr.innerHTML = `
                <td class="px-4 py-3">
                    <div class="text-sm font-medium">${tanggalFormatted}</div>
                    <div class="text-xs text-gray-500">${jamFormatted}</div>
                </td>
                <td class="px-4 py-3">${transaksi.jenis || '-'}</td>
                <td class="px-4 py-3">${namaItem}</td>
                <td class="px-4 py-3">Rp ${nominal.toLocaleString()}</td>
                <td class="px-4 py-3">Rp ${keuntungan.toLocaleString()}</td>
                <td class="px-4 py-3">${metode}</td>
                <td class="px-4 py-3"><div class="text-xs">${saldoDigunakan}</div></td>
                <td class="px-4 py-3">${userDisplay}</td>
                <td class="px-4 py-3">
                    ${currentUserRole === 'admin' ? `
                    <div class="flex space-x-2">
                        <button onclick="editTransaksi(${transaksi.id})" class="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded border border-blue-300 hover:bg-blue-50">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteTransaksi(${transaksi.id})" class="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded border border-red-300 hover:bg-red-50">
                            🗑️ Hapus
                        </button>
                    </div>
                    ` : `
                    <span class="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                        📊 View Only
                    </span>
                    `}
                </td>
            `;
            tbody.appendChild(tr);
        });
    }
    

    // Filter laporan by tanggal dari database
    async function filterLaporan() {
        const tanggalMulai = document.getElementById('tanggalMulai').value;
        const tanggalAkhir = document.getElementById('tanggalAkhir').value;
        
        if (!tanggalMulai || !tanggalAkhir) {
            alert('Pilih tanggal mulai dan akhir terlebih dahulu!');
            return;
        }

        let url = `api.php?action=get_transaksi&start=${tanggalMulai}&end=${tanggalAkhir}`;
        if (currentUserRole === 'kasir') {
            url += `&user=${encodeURIComponent(currentUser)}`;
        }

        const res = await fetch(url, {credentials:'include'});
        const data = await res.json();
        transaksiData = data;
        loadLaporanData();
        alert('Filter berhasil diterapkan!');
    }
//done

    async function exportLaporan() {
        // Ambil data transaksi dari MySQL
        let url = 'api.php?action=get_transaksi';
        if (currentUserRole === 'kasir') {
            url += `&user=${encodeURIComponent(currentUser)}`;
        }

        const res = await fetch(url, {credentials:'include'});
        const data = await res.json();
        let filteredData = data;

        if (filteredData.length === 0) {
            alert('Tidak ada data transaksi untuk diekspor!');
            return;
        }

        // Buat CSV content
        let csvContent = "data:text/csv;charset=utf-8,";

        // Header
        csvContent += "No,Tanggal,Jam,Jenis Transaksi,Item/Layanan,Nominal,Keuntungan,Metode Pembayaran,Aplikasi Digunakan,User,Margin (%)\n";

        // Isi data
        filteredData.forEach((transaksi, index) => {
            const tanggalObj = new Date(transaksi.tanggal);
            const tanggalFormatted = tanggalObj.toLocaleDateString('id-ID');
            const jamFormatted = tanggalObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

            const nominal = parseFloat(transaksi.nominal);
            const keuntungan = parseFloat(transaksi.keuntungan);
            const modal = nominal - keuntungan;
            const marginPercent = modal > 0 ? ((keuntungan / modal) * 100).toFixed(1) : '0';

            csvContent += `${index + 1},"${tanggalFormatted}","${jamFormatted}","${transaksi.jenis}","${transaksi.nama_item}",${nominal},${keuntungan},"${transaksi.metode_pembayaran}","${transaksi.aplikasi || 'Tunai'}","${transaksi.user || 'System'}",${marginPercent}%\n`;
        });

        // Ringkasan di akhir
        csvContent += "\n";
        csvContent += "RINGKASAN LAPORAN TRANSAKSI\n";
        csvContent += `Total Transaksi,${filteredData.length}\n`;
        const totalPenjualan = filteredData.reduce((sum, t) => sum + parseFloat(t.nominal), 0);
        const totalKeuntungan = filteredData.reduce((sum, t) => sum + parseFloat(t.keuntungan), 0);
        csvContent += `Total Penjualan,${totalPenjualan}\n`;
        csvContent += `Total Keuntungan,${totalKeuntungan}\n`;

        // Rata-rata per transaksi
        const rataRataPenjualan = filteredData.length > 0 ? Math.round(totalPenjualan / filteredData.length) : 0;
        csvContent += `Rata-rata per Transaksi,${rataRataPenjualan}\n`;

        // Rata-rata margin
        if (filteredData.length > 0) {
            const totalMargin = filteredData.reduce((sum, t) => {
                const nominal = parseFloat(t.nominal);
                const keuntungan = parseFloat(t.keuntungan);
                const modal = nominal - keuntungan;
                return sum + (modal > 0 ? (keuntungan / modal) * 100 : 0);
            }, 0);
            const rataRataMargin = (totalMargin / filteredData.length).toFixed(1);
            csvContent += `Rata-rata Margin,${rataRataMargin}%\n`;
        }

        // Ringkasan per jenis transaksi
        csvContent += "\nRINGKASAN PER JENIS TRANSAKSI\n";
        const jenisGroup = {};
        filteredData.forEach(t => {
            if (!jenisGroup[t.jenis]) {
                jenisGroup[t.jenis] = { count: 0, nominal: 0, keuntungan: 0 };
            }
            jenisGroup[t.jenis].count++;
            jenisGroup[t.jenis].nominal += parseFloat(t.nominal);
            jenisGroup[t.jenis].keuntungan += parseFloat(t.keuntungan);
        });
        Object.keys(jenisGroup).forEach(jenis => {
            const data = jenisGroup[jenis];
            csvContent += `${jenis},${data.count} transaksi,Rp ${data.nominal.toLocaleString()},Rp ${data.keuntungan.toLocaleString()}\n`;
        });

        // Ringkasan per metode pembayaran
        csvContent += "\nRINGKASAN PER METODE PEMBAYARAN\n";
        const metodeBayarGroup = {};
        filteredData.forEach(t => {
            if (!metodeBayarGroup[t.metode_pembayaran]) {
                metodeBayarGroup[t.metode_pembayaran] = { count: 0, nominal: 0 };
            }
            metodeBayarGroup[t.metode_pembayaran].count++;
            metodeBayarGroup[t.metode_pembayaran].nominal += parseFloat(t.nominal);
        });
        Object.keys(metodeBayarGroup).forEach(metode => {
            const data = metodeBayarGroup[metode];
            csvContent += `${metode},${data.count} transaksi,Rp ${data.nominal.toLocaleString()}\n`;
        });

        // Metadata
        csvContent += `\nDiekspor pada,${new Date().toLocaleString('id-ID')}\n`;
        csvContent += `Diekspor oleh,${currentUser || 'System'}\n`;
        csvContent += `Filter User,${currentUserRole === 'kasir' ? currentUser + ' (Kasir)' : 'Semua User (Admin)'}\n`;

        // Generate file
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);

        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        const userSuffix = currentUserRole === 'kasir' ? `_${currentUser}` : '_All';
        link.setAttribute("download", `Laporan_Transaksi_${dateStr}${userSuffix}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Log activity ke MySQL
        logActivity('transaksi', 'Export laporan transaksi ke Excel', `Total ${filteredData.length} transaksi diekspor`);

        alert(`Laporan transaksi berhasil diekspor!\nFile: Laporan_Transaksi_${dateStr}${userSuffix}.csv\nTotal: ${filteredData.length} transaksi\nTotal Penjualan: Rp ${totalPenjualan.toLocaleString()}`);
    }
//done
    async function exportBarangToExcel() {
        // Ambil data barang dari database melalui API
        const res = await fetch('api.php?action=get_barang', { credentials: 'include' });
        const barangData = await res.json();

        if (!barangData || barangData.length === 0) {
            alert('Tidak ada data barang untuk diekspor!');
            return;
        }

        // Buat CSV content
        let csvContent = "data:text/csv;charset=utf-8,";

        // Header
        csvContent += "No,Nama Barang,Harga Beli,Harga Jual,Stok,Keuntungan per Item,Margin (%),Nilai Stok,Potensi Keuntungan\n";

        // Data barang
        barangData.forEach((barang, index) => {
            const hargaBeli = parseFloat(barang.harga_beli);
            const hargaJual = parseFloat(barang.harga_jual);
            const stok = parseInt(barang.stok);

            const keuntunganPerItem = hargaJual - hargaBeli;
            const marginPercent = ((keuntunganPerItem / hargaBeli) * 100).toFixed(1);
            const nilaiStok = hargaBeli * stok;
            const potensiKeuntungan = keuntunganPerItem * stok;

            csvContent += `${index + 1},"${barang.nama}",${hargaBeli},${hargaJual},${stok},${keuntunganPerItem},${marginPercent}%,${nilaiStok},${potensiKeuntungan}\n`;
        });

        // Ringkasan di akhir
        csvContent += "\n";
        csvContent += "RINGKASAN DATA BARANG\n";
        csvContent += `Total Jenis Barang,${barangData.length}\n`;
        csvContent += `Total Stok,${barangData.reduce((sum, b) => sum + parseInt(b.stok), 0)}\n`;
        csvContent += `Total Modal,${barangData.reduce((sum, b) => sum + (parseFloat(b.harga_beli) * parseInt(b.stok)), 0)}\n`;
        csvContent += `Potensi Keuntungan,${barangData.reduce((sum, b) => sum + ((parseFloat(b.harga_jual) - parseFloat(b.harga_beli)) * parseInt(b.stok)), 0)}\n`;

        // Rata-rata margin
        if (barangData.length > 0) {
            const totalMargin = barangData.reduce((sum, b) => {
                const margin = ((parseFloat(b.harga_jual) - parseFloat(b.harga_beli)) / parseFloat(b.harga_beli)) * 100;
                return sum + margin;
            }, 0);
            const rataRataMargin = (totalMargin / barangData.length).toFixed(1);
            csvContent += `Rata-rata Margin,${rataRataMargin}%\n`;
        }

        // Status stok
        const barangStokMenipis = barangData.filter(b => parseInt(b.stok) > 0 && parseInt(b.stok) <= 5);
        const barangStokHabis = barangData.filter(b => parseInt(b.stok) === 0);
        csvContent += `Barang Stok Menipis (≤5),${barangStokMenipis.length}\n`;
        csvContent += `Barang Stok Habis,${barangStokHabis.length}\n`;

        // Metadata
        csvContent += `\nDiekspor pada,${new Date().toLocaleString('id-ID')}\n`;
        csvContent += `Diekspor oleh,${currentUser || 'System'}\n`;

        // Generate file CSV
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);

        // Nama file dengan tanggal
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        link.setAttribute("download", `Data_Barang_${dateStr}.csv`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Log aktivitas ke MySQL
        logActivity('edit_barang', 'Export data barang ke Excel', `Total ${barangData.length} item barang diekspor`);

        alert(`Data barang berhasil diekspor!\nFile: Data_Barang_${dateStr}.csv\nTotal: ${barangData.length} item barang`);
    }
    
    // Load transaksi dari database saat halaman dibuka
    async function initTransaksiData() {
        const res = await fetch('api.php?action=get_transaksi', { credentials: 'include' });
        transaksiData = await res.json();
        loadRiwayatTransaksi();
        updateTotalHariIni();
    }
    initTransaksiData();



    // Load saldo dari database saat halaman dibuka
    async function initSaldoData() {
        const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
        saldoData = await res.json(); // bentuk array dari database
        loadSaldoData(); // render ke dashboard
    }
    initSaldoData();



    // Shopping functions
    function handleJenisBelanjaChange() {
        const jenisBelanja = document.getElementById('jenisBelanjaSelect').value;
        const labelNamaItem = document.getElementById('labelNamaItem');
        const namaBarangInput = document.getElementById('namaBarangBelanja');
        const hargaJualContainer = document.getElementById('hargaJualContainer');
        const jenisBelanjaInfo = document.getElementById('jenisBelanjaInfo');
    
        if (jenisBelanja === 'pengeluaran') {
            // Mode: Pengeluaran Konter
            labelNamaItem.textContent = 'Nama Pengeluaran';
            namaBarangInput.placeholder = 'Contoh: Listrik, Air, Internet, Pulsa Pribadi';
            hargaJualContainer.classList.add('hidden');
            jenisBelanjaInfo.textContent = 'Pengeluaran hanya akan tercatat di laporan belanja, tidak menambah stok barang';
            jenisBelanjaInfo.className = 'text-xs text-orange-600 mt-1';
    
            // Harga jual direset agar tidak menyebabkan NaN saat disimpan
            document.getElementById('hargaJualBelanja').value = '';
        } else {
            // Mode: Belanja Barang
            labelNamaItem.textContent = 'Nama Barang';
            namaBarangInput.placeholder = 'Contoh: Case iPhone 14';
            hargaJualContainer.classList.remove('hidden');
            jenisBelanjaInfo.textContent = 'Barang akan ditambahkan ke data stok dan tercatat di laporan belanja';
            jenisBelanjaInfo.className = 'text-xs text-gray-500 mt-1';
        }
    
        // Pastikan total belanja dihitung ulang agar tidak NaN
        updateTotalBelanja();
    }
    
    function updateTotalBelanja() {
        const jumlah = parseFloat(document.getElementById('jumlahBarangBelanja').value);
        const harga = parseFloat(document.getElementById('hargaPerItem').value);
        const totalInput = document.getElementById('totalBelanja');
    
        if (isNaN(jumlah) || isNaN(harga)) {
            totalInput.value = '';
            return;
        }
    
        const total = jumlah * harga;
        totalInput.value = total;
    }
    
    async function checkSaldoBelanja() {
        const metode = document.getElementById('metodePembayaranBelanja').value;
        const saldoInfo = document.getElementById('saldoInfoBelanja');
        const saldoTersedia = document.getElementById('saldoTersediaBelanja');
    
        if (!metode) {
            saldoInfo.classList.add('hidden');
            return;
        }
    
        try {
            const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
            const response = await res.json();
            const data = response.data;
    
            if (!data || typeof data !== 'object') {
                console.error('❌ Data saldo tidak valid:', response);
                saldoTersedia.textContent = 'Rp 0';
                saldoTersedia.className = 'font-semibold text-red-600';
                saldoInfo.classList.remove('hidden');
                return;
            }
    
            const saldo = parseFloat(data[metode]) || 0;
    
            saldoTersedia.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
            saldoTersedia.className = saldo > 0 
                ? 'font-semibold text-green-600' 
                : 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
        } catch (error) {
            console.error('❌ Error saat cek saldo belanja:', error);
            saldoTersedia.textContent = 'Rp 0';
            saldoTersedia.className = 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
        }
    }
    
    
    async function simpanBelanja() {
        const jenisBelanja = document.getElementById('jenisBelanjaSelect').value;
        const namaBarang = document.getElementById('namaBarangBelanja').value.trim();
        const jumlah = parseInt(document.getElementById('jumlahBarangBelanja').value) || 0;
        const hargaPerItem = parseFloat(document.getElementById('hargaPerItem').value) || 0;
        const hargaJual = parseFloat(document.getElementById('hargaJualBelanja').value) || 0;
        const totalBelanja = jumlah * hargaPerItem;
        const metodePembayaran = document.getElementById('metodePembayaranBelanja').value;
        const supplier = document.getElementById('supplierBelanja').value.trim();
        const catatan = document.getElementById('catatanBelanja').value.trim();
    
        // Validasi input
        if (!namaBarang) {
            alert(jenisBelanja === 'pengeluaran' ? 'Masukkan nama pengeluaran!' : 'Masukkan nama barang!');
            return;
        }
        if (jumlah <= 0) {
            alert('Jumlah harus lebih dari 0!');
            return;
        }
        if (hargaPerItem <= 0) {
            alert('Harga per item harus lebih dari 0!');
            return;
        }
        if (jenisBelanja === 'barang') {
            if (hargaJual <= 0) {
                alert('Masukkan harga jual yang valid!');
                return;
            }
            if (hargaJual <= hargaPerItem) {
                alert('Harga jual harus lebih tinggi dari harga beli!');
                return;
            }
        }
        if (!metodePembayaran) {
            alert('Pilih metode pembayaran!');
            return;
        }
        if (!supplier) {
            alert('Masukkan nama supplier atau toko!');
            return;
        }
    
        // Kirim data ke API
        const fd = new FormData();
        fd.append('jenis_belanja', jenisBelanja);
        fd.append('nama_barang', namaBarang);
        fd.append('jumlah', jumlah);
        fd.append('harga_per_item', hargaPerItem);
        fd.append('harga_jual', hargaJual); // tetap dikirim walau nol
        fd.append('total_belanja', totalBelanja);
        fd.append('metode_pembayaran', metodePembayaran);
        fd.append('supplier', supplier);
        fd.append('catatan', catatan);
    
        try {
            const res = await fetch('api.php?action=simpan_belanja', {
                method: 'POST',
                body: fd,
                credentials: 'include'
            });
    
            const raw = await res.text();
            let json;
    
            try {
                json = JSON.parse(raw);
            } catch (e) {
                console.error("❌ Respon bukan JSON:", raw);
                alert("Respon server tidak valid.");
                return;
            }
    
            if (json.success) {
                // Reset form
                document.getElementById('jenisBelanjaSelect').value = 'barang';
                document.getElementById('namaBarangBelanja').value = '';
                document.getElementById('jumlahBarangBelanja').value = '';
                document.getElementById('hargaPerItem').value = '';
                document.getElementById('hargaJualBelanja').value = '';
                document.getElementById('totalBelanja').value = '';
                document.getElementById('metodePembayaranBelanja').value = 'Tunai';
                document.getElementById('supplierBelanja').value = '';
                document.getElementById('catatanBelanja').value = '';
                document.getElementById('saldoInfoBelanja').classList.add('hidden');
                handleJenisBelanjaChange();
    
                // Refresh UI data
                await loadRiwayatBelanja();           // ✅ tampil ulang belanja hari ini
                await updateTotalBelanjaHariIni();    // ✅ update totalnya
                await loadSaldoData();                // ✅ update saldo setelah dikurangi
    
                if (jenisBelanja === 'barang') {
                    await loadBarangData();           // ✅ perbarui stok dan harga jika belanja barang
                }
    
                alert(jenisBelanja === 'barang'
                    ? '✅ Belanja berhasil disimpan dan stok barang diperbarui.'
                    : '✅ Pengeluaran berhasil disimpan.'
                );
            } else {
                alert(json.msg || '❌ Gagal menyimpan belanja.');
            }
    
        } catch (err) {
            console.error("❌ Error saat menyimpan belanja:", err);
            alert('Terjadi kesalahan saat menyimpan belanja.');
        }
    }
    
    function loadBelanjaData() {
        loadRiwayatBelanja();
        updateTotalBelanjaHariIni();
    }

    async function loadRiwayatBelanja() {
        const container = document.getElementById('riwayatBelanja');
        const totalDisplay = document.getElementById('totalBelanjaHariIni');
        container.innerHTML = '<p class="text-gray-500 text-center py-4">Memuat data...</p>';
    
        try {
            const res = await fetch('api.php?action=get_belanja', { credentials: 'include' });
            const belanjaData = await res.json();
    
            const today = new Date().toISOString().split('T')[0];
            const todayBelanja = belanjaData.filter(b =>
                typeof b.tanggal === 'string' && b.tanggal.startsWith(today)
            );
    
            container.innerHTML = '';
    
            if (todayBelanja.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada belanja hari ini</p>';
                totalDisplay.textContent = 'Rp 0';
                return;
            }
    
            let totalBelanja = 0;
    
            todayBelanja.forEach(belanja => {
                const div = document.createElement('div');
                div.className = 'bg-gray-50 rounded-lg p-4';
    
                const isBarang = belanja.jenis_belanja === 'barang';
                const typeBadge = isBarang
                    ? '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 mr-2">📦 Barang</span>'
                    : '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800 mr-2">💸 Pengeluaran</span>';
    
                const jumlah = parseInt(belanja.jumlah) || 0;
                const hargaPerItem = parseFloat(belanja.harga_per_item) || 0;
                const total = parseFloat(belanja.total_belanja);
                const totalFormatted = isNaN(total) ? jumlah * hargaPerItem : total;
    
                totalBelanja += totalFormatted;
    
                div.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <div class="flex items-center mb-1">
                                ${typeBadge}
                                <h4 class="font-semibold text-gray-800">${belanja.nama_barang}</h4>
                            </div>
                            <p class="text-sm text-gray-600">${jumlah}x @ Rp ${hargaPerItem.toLocaleString()}</p>
                            <p class="text-sm text-gray-600">${belanja.supplier || '-'} • ${belanja.metode_pembayaran}</p>
                            <p class="text-xs text-gray-500">${new Date(belanja.tanggal).toLocaleTimeString()} • ${belanja.user || 'System'}</p>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-red-600">-Rp ${totalFormatted.toLocaleString()}</p>
                        </div>
                    </div>
                `;
    
                container.appendChild(div);
            });
    
            totalDisplay.textContent = `Rp ${totalBelanja.toLocaleString()}`;
    
        } catch (err) {
            container.innerHTML = `<p class="text-red-600 text-center py-4">Gagal memuat data belanja</p>`;
            console.error('❌ Gagal load belanja:', err);
            document.getElementById('totalBelanjaHariIni').textContent = 'Rp 0';
        }
    }
        
    async function updateTotalBelanjaHariIni() {
        try {
            const res = await fetch('api.php?action=get_belanja', { credentials: 'include' });
            const belanjaData = await res.json();
    
            const todayStr = new Date().toDateString();
            const todayBelanja = belanjaData.filter(b => {
                const tanggal = new Date(b.tanggal);
                return tanggal.toDateString() === todayStr;
            });
    
            const totalBelanja = todayBelanja.reduce((sum, b) => {
                const total = parseFloat(b.total_belanja);
                return sum + (isNaN(total) ? 0 : total);
            }, 0);
    
            document.getElementById('totalBelanjaHariIni').textContent = `Rp ${totalBelanja.toLocaleString()}`;
        } catch (err) {
            console.error('❌ Gagal update total belanja:', err);
            document.getElementById('totalBelanjaHariIni').textContent = 'Rp 0';
        }
    }
    
    async function loadLaporanBelanjaData() {
        try {
            // Ambil data belanja dari server
            const res = await fetch('api.php?action=get_belanja', { credentials: 'include' });
            const belanjaData = await res.json();
    
            // Hitung total belanja keseluruhan
            const totalBelanja = belanjaData.reduce((sum, b) => {
                const val = parseFloat(b.total_belanja);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
    
            // Hitung total item yang dibeli
            const totalItem = belanjaData.reduce((sum, b) => {
                const j = parseInt(b.jumlah);
                return sum + (isNaN(j) ? 0 : j);
            }, 0);
    
            const totalTransaksi = belanjaData.length;
    
            // Pisahkan berdasarkan jenis belanja
            const belanjaBarang = belanjaData.filter(b => b.jenis_belanja === 'barang' || !b.jenis_belanja);
            const pengeluaranKonter = belanjaData.filter(b => b.jenis_belanja === 'pengeluaran');
    
            const totalBelanjaBarang = belanjaBarang.reduce((sum, b) => {
                const val = parseFloat(b.total_belanja);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
    
            const totalPengeluaranKonter = pengeluaranKonter.reduce((sum, b) => {
                const val = parseFloat(b.total_belanja);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
    
            // Update tampilan DOM
            document.getElementById('totalBelanjaLaporan').textContent = `Rp ${totalBelanja.toLocaleString()}`;
            document.getElementById('totalBelanjaBarang').textContent = `Rp ${totalBelanjaBarang.toLocaleString()}`;
            document.getElementById('totalPengeluaranKonter').textContent = `Rp ${totalPengeluaranKonter.toLocaleString()}`;
            document.getElementById('totalItemBelanja').textContent = totalItem;
            document.getElementById('totalTransaksiBelanja').textContent = totalTransaksi;
    
            // Panggil render tabel laporan
            loadLaporanBelanjaTable(belanjaData);
    
        } catch (err) {
            console.error('❌ Gagal memuat data belanja:', err);
            document.getElementById('totalBelanjaLaporan').textContent = 'Rp 0';
            document.getElementById('totalBelanjaBarang').textContent = 'Rp 0';
            document.getElementById('totalPengeluaranKonter').textContent = 'Rp 0';
            document.getElementById('totalItemBelanja').textContent = '0';
            document.getElementById('totalTransaksiBelanja').textContent = '0';
        }
    }
    
    function loadLaporanBelanjaTable(data = []) {
        const tbody = document.getElementById('laporanBelanjaTableBody');
        tbody.innerHTML = '';
    
        if (!data || data.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="px-4 py-8 text-center text-gray-500">
                        Belum ada data belanja
                    </td>
                </tr>
            `;
            return;
        }
    
        data.forEach(belanja => {
            const tr = document.createElement('tr');
            tr.className = 'border-b hover:bg-gray-50';
    
            // Tetapkan jenis belanja default: 'barang' jika kosong/null
            const isBarang = belanja.jenis_belanja === 'barang' || !belanja.jenis_belanja;
            const typeBadge = isBarang
                ? '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">📦 Barang</span>'
                : '<span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">💸 Pengeluaran</span>';
    
            // Format angka dan tanggal
            const tanggalFormatted = new Date(belanja.tanggal).toLocaleDateString('id-ID');
            const hargaItem = parseFloat(belanja.harga_per_item || 0).toLocaleString('id-ID');
            const totalBelanja = parseFloat(belanja.total_belanja || 0).toLocaleString('id-ID');
            const supplier = belanja.supplier || '-';
    
            tr.innerHTML = `
                <td class="px-4 py-3">${tanggalFormatted}</td>
                <td class="px-4 py-3">${typeBadge}</td>
                <td class="px-4 py-3">${belanja.nama_barang}</td>
                <td class="px-4 py-3">${belanja.jumlah}</td>
                <td class="px-4 py-3">Rp ${hargaItem}</td>
                <td class="px-4 py-3">Rp ${totalBelanja}</td>
                <td class="px-4 py-3">${belanja.metode_pembayaran}</td>
                <td class="px-4 py-3">${supplier}</td>
            `;
            tbody.appendChild(tr);
        });
    }
    
    async function filterLaporanBelanja() {
        const tanggalMulai = document.getElementById('tanggalMulaiBelanja').value;
        const tanggalAkhir = document.getElementById('tanggalAkhirBelanja').value;
    
        if (!tanggalMulai || !tanggalAkhir) {
            alert('Pilih tanggal mulai dan akhir terlebih dahulu!');
            return;
        }
    
        try {
            const res = await fetch(`api.php?action=get_belanja&tanggal_mulai=${tanggalMulai}&tanggal_akhir=${tanggalAkhir}`, {
                credentials: 'include'
            });
    
            const data = await res.json();
    
            if (!Array.isArray(data)) throw new Error("Format data tidak valid");
    
            loadLaporanBelanjaTable(data);
    
            // Hitung total & update ringkasan
            const totalBelanja = data.reduce((sum, b) => sum + parseFloat(b.total_belanja || 0), 0);
            const totalItem = data.reduce((sum, b) => sum + parseInt(b.jumlah || 0), 0);
            const totalTransaksi = data.length;
    
            const belanjaBarang = data.filter(b => b.jenis_belanja === 'barang' || !b.jenis_belanja);
            const pengeluaranKonter = data.filter(b => b.jenis_belanja === 'pengeluaran');
    
            const totalBelanjaBarang = belanjaBarang.reduce((sum, b) => sum + parseFloat(b.total_belanja || 0), 0);
            const totalPengeluaranKonter = pengeluaranKonter.reduce((sum, b) => sum + parseFloat(b.total_belanja || 0), 0);
    
            // Update tampilan
            document.getElementById('totalBelanjaLaporan').textContent = `Rp ${totalBelanja.toLocaleString()}`;
            document.getElementById('totalBelanjaBarang').textContent = `Rp ${totalBelanjaBarang.toLocaleString()}`;
            document.getElementById('totalPengeluaranKonter').textContent = `Rp ${totalPengeluaranKonter.toLocaleString()}`;
            document.getElementById('totalItemBelanja').textContent = totalItem;
            document.getElementById('totalTransaksiBelanja').textContent = totalTransaksi;
    
            alert('Filter laporan belanja berhasil diterapkan!');
        } catch (err) {
            console.error("❌ Error saat memfilter laporan:", err);
            alert('Terjadi kesalahan saat memfilter laporan.');
        }
    }
   
    async function exportLaporanBelanja() {
        try {
            const res = await fetch('api.php?action=get_belanja', { credentials: 'include' });
            const belanjaData = await res.json();
    
            if (!Array.isArray(belanjaData) || belanjaData.length === 0) {
                alert('Tidak ada data belanja untuk diekspor!');
                return;
            }
    
            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "No,Tanggal,Jam,Jenis Belanja,Nama Item,Jumlah,Harga per Item,Total Belanja,Metode Pembayaran,Supplier,Catatan,User\n";
    
            belanjaData.forEach((b, i) => {
                const tanggalObj = new Date(b.tanggal);
                const tanggalFormatted = tanggalObj.toLocaleDateString('id-ID');
                const jamFormatted = tanggalObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                const jenisBelanja = b.jenis_belanja === 'pengeluaran' ? 'Pengeluaran Konter' : 'Belanja Barang';
    
                csvContent += `${i + 1},"${tanggalFormatted}","${jamFormatted}","${jenisBelanja}","${b.nama_barang}",${b.jumlah},${b.harga_per_item},${b.total_belanja},"${b.metode_pembayaran}","${b.supplier || ''}","${b.catatan || ''}","${b.user || 'System'}"\n`;
            });
    
            // Ringkasan
            csvContent += "\nRINGKASAN LAPORAN BELANJA\n";
    
            const belanjaBarang = belanjaData.filter(b => b.jenis_belanja !== 'pengeluaran');
            const pengeluaranKonter = belanjaData.filter(b => b.jenis_belanja === 'pengeluaran');
    
            const totalBelanja = belanjaData.reduce((sum, b) => sum + Number(b.total_belanja), 0);
            const totalBelanjaBarang = belanjaBarang.reduce((sum, b) => sum + Number(b.total_belanja), 0);
            const totalPengeluaranKonter = pengeluaranKonter.reduce((sum, b) => sum + Number(b.total_belanja), 0);
            const totalItem = belanjaData.reduce((sum, b) => sum + Number(b.jumlah), 0);
    
            csvContent += `Total Belanja,${totalBelanja}\n`;
            csvContent += `Total Belanja Barang,${totalBelanjaBarang}\n`;
            csvContent += `Total Pengeluaran Konter,${totalPengeluaranKonter}\n`;
            csvContent += `Total Item Dibeli,${totalItem}\n`;
            csvContent += `Total Transaksi,${belanjaData.length}\n`;
    
            const rataRata = belanjaData.length > 0 ? Math.round(totalBelanja / belanjaData.length) : 0;
            csvContent += `Rata-rata per Transaksi,${rataRata}\n`;
    
            // Metode pembayaran
            csvContent += "\nRINGKASAN PER METODE PEMBAYARAN\n";
            const metodeMap = {};
            belanjaData.forEach(b => {
                const metode = b.metode_pembayaran || 'Tunai';
                if (!metodeMap[metode]) metodeMap[metode] = { count: 0, total: 0 };
                metodeMap[metode].count++;
                metodeMap[metode].total += Number(b.total_belanja);
            });
            Object.entries(metodeMap).forEach(([metode, data]) => {
                csvContent += `${metode},${data.count} transaksi,Rp ${data.total.toLocaleString()}\n`;
            });
    
            // Supplier
            csvContent += "\nRINGKASAN PER SUPPLIER\n";
            const supplierMap = {};
            belanjaData.forEach(b => {
                const supplier = b.supplier || 'Tidak diketahui';
                if (!supplierMap[supplier]) supplierMap[supplier] = { count: 0, total: 0 };
                supplierMap[supplier].count++;
                supplierMap[supplier].total += Number(b.total_belanja);
            });
            Object.entries(supplierMap).forEach(([supp, data]) => {
                csvContent += `${supp},${data.count} transaksi,Rp ${data.total.toLocaleString()}\n`;
            });
    
            // Metadata export
            csvContent += `\nDiekspor pada,${new Date().toLocaleString('id-ID')}\n`;
            csvContent += `Diekspor oleh,${currentUser || 'System'}\n`;
    
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            const today = new Date().toISOString().split('T')[0];
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Laporan_Belanja_${today}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
    
            logActivity('belanja', 'Export laporan belanja ke Excel', `Total ${belanjaData.length} transaksi belanja diekspor`);
    
            alert(`✅ Laporan belanja berhasil diekspor!\nFile: Laporan_Belanja_${today}.csv\nTotal: ${belanjaData.length} transaksi\nTotal Belanja: Rp ${totalBelanja.toLocaleString()}`);
        } catch (err) {
            console.error("❌ Gagal export laporan belanja:", err);
            alert('Terjadi kesalahan saat ekspor laporan.');
        }
    }
    


    
        // Transfer Saldo Functions
    
    // async function checkSaldoAsal() {
    //     const metode = document.getElementById('transferMetodeAsal').value;
    //     const saldoInfo = document.getElementById('saldoInfoAsal');
    //     const saldoTersedia = document.getElementById('saldoTersediaAsal');

    //     if (!metode) {
    //         saldoInfo.classList.add('hidden');
    //         return;
    //     }

    //     try {
    //         const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
    //         const json = await res.json();

    //         if (!json.success || typeof json.data !== 'object') {
    //             throw new Error('Format saldo tidak valid');
    //         }

    //         // Ambil saldo langsung dari key object
    //         const saldo = parseFloat(json.data[metode] ?? 0);

    //         saldoTersedia.textContent = `Rp ${saldo.toLocaleString()}`;
    //         saldoTersedia.className = saldo > 0
    //             ? 'font-semibold text-green-600'
    //             : 'font-semibold text-red-600';
    //         saldoInfo.classList.remove('hidden');

    //     } catch (err) {
    //         console.error('❌ Gagal cek saldo asal:', err);
    //         saldoInfo.classList.add('hidden');
    //     }
    // }

    async function checkSaldoAsal() {
        const metodeEl = document.getElementById('dariAplikasi');
        const saldoInfo = document.getElementById('saldoAsalInfo');
        const saldoTersedia = document.getElementById('saldoAsal');
    
        if (!metodeEl) {
            console.warn('⚠️ Elemen dariAplikasi tidak ditemukan.');
            return;
        }
    
        const metode = metodeEl.value;
        if (!metode) {
            saldoInfo.classList.add('hidden');
            return;
        }
    
        try {
            const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
            const json = await res.json();
    
            if (!json.success || typeof json.data !== 'object') {
                throw new Error('Format saldo tidak valid');
            }
    
            // Ambil saldo langsung dari object API
            const saldo = parseFloat(json.data[metode] ?? 0);
    
            saldoTersedia.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
            saldoTersedia.className = saldo > 0
                ? 'font-semibold text-green-600'
                : 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
        } catch (err) {
            console.error('❌ Gagal cek saldo asal:', err);
            saldoInfo.classList.add('hidden');
            alert('Gagal memuat saldo dari server.');
        }
    }
    
    
    

    async function checkSaldoTujuan() {
        const metodeEl = document.getElementById('keAplikasi');
        const saldoInfo = document.getElementById('saldoTujuanInfo');
        const saldoTujuan = document.getElementById('saldoTujuan');
    
        if (!metodeEl || !saldoInfo || !saldoTujuan) {
            console.warn('⚠️ Elemen saldo tujuan tidak ditemukan di DOM.');
            return;
        }
    
        const aplikasi = metodeEl.value;
        if (!aplikasi) {
            saldoInfo.classList.add('hidden');
            return;
        }
    
        try {
            const res = await fetch('api.php?action=get_saldo', { credentials: 'include' });
    
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
            const json = await res.json();
    
            if (!json.success || typeof json.data !== 'object') {
                throw new Error('Format saldo tidak valid');
            }
    
            // Ambil saldo langsung dari object API
            const saldo = parseFloat(json.data[aplikasi] ?? 0);
    
            saldoTujuan.textContent = `Rp ${saldo.toLocaleString('id-ID')}`;
            saldoTujuan.className =
                saldo > 0
                    ? 'font-semibold text-green-600'
                    : 'font-semibold text-red-600';
            saldoInfo.classList.remove('hidden');
    
        } catch (err) {
            console.error("❌ Gagal cek saldo tujuan:", err);
            saldoInfo.classList.add('hidden');
            alert('Gagal memuat saldo dari server.');
        }
    }
    
    
    function updateBiayaAdmin() {
        const jumlahTransfer = parseFloat(document.getElementById('jumlahTransfer').value) || 0;
        const biayaAdmin = parseFloat(document.getElementById('biayaAdmin').value) || 0;
        const jumlahDiterima = jumlahTransfer - biayaAdmin;
        
        document.getElementById('jumlahDiterima').value = jumlahDiterima > 0 ? jumlahDiterima : 0;
    }

    async function prosesTransferSaldo() {
        const dariAplikasi = document.getElementById('dariAplikasi').value;
        const keAplikasi = document.getElementById('keAplikasi').value;
        const jumlahTransfer = parseFloat(document.getElementById('jumlahTransfer').value);
        const biayaAdmin = parseFloat(document.getElementById('biayaAdmin').value) || 0;
        const jumlahDiterima = parseFloat(document.getElementById('jumlahDiterima').value);
        const keterangan = document.getElementById('keteranganTransfer').value.trim();
    
        // ✅ Validasi input
        if (!dariAplikasi || !keAplikasi) return alert('Pilih aplikasi asal dan tujuan!');
        if (dariAplikasi === keAplikasi) return alert('Aplikasi asal dan tujuan tidak boleh sama!');
        if (!jumlahTransfer || jumlahTransfer <= 0) return alert('Masukkan jumlah transfer yang valid!');
        if (biayaAdmin < 0) return alert('Biaya admin tidak boleh negatif!');
        if (!jumlahDiterima || jumlahDiterima <= 0) return alert('Jumlah yang diterima harus lebih dari 0!');
    
        try {
            const res = await fetch('api.php', {
                method: 'POST',
                body: new URLSearchParams({
                    action: 'transfer_saldo',
                    dari_aplikasi: dariAplikasi,
                    ke_aplikasi: keAplikasi,
                    jumlah_transfer: jumlahTransfer,
                    biaya_admin: biayaAdmin,
                    jumlah_diterima: jumlahDiterima,
                    keterangan: keterangan
                }),
                credentials: 'include'
            });
    
            const text = await res.text();
            let json;
            try {
                json = JSON.parse(text);
            } catch (err) {
                console.error("❌ Response bukan JSON valid:", text);
                alert('Server mengirim data bukan JSON. Cek console untuk detail.');
                return;
            }
    
            if (json.success) {
                alert('✅ Transfer berhasil disimpan!');
    
                // ✅ Simpan log aktivitas
                await logActivity(
                    'transfer',
                    `Transfer saldo: ${dariAplikasi} → ${keAplikasi}`,
                    `Jumlah: Rp ${jumlahDiterima.toLocaleString()}, Biaya admin: Rp ${biayaAdmin.toLocaleString()}`
                );
    
                // ✅ Reset form
                document.getElementById('dariAplikasi').value = '';
                document.getElementById('keAplikasi').value = '';
                document.getElementById('jumlahTransfer').value = '';
                document.getElementById('biayaAdmin').value = '';
                document.getElementById('jumlahDiterima').value = '';
                document.getElementById('keteranganTransfer').value = '';
                document.getElementById('saldoAsalInfo').classList.add('hidden');
                document.getElementById('saldoTujuanInfo').classList.add('hidden');
    
                // ✅ Refresh data & UI
                await loadRiwayatTransfer();
                await loadSaldoData();
                updateTotalTransferHariIni();
                await loadLogAktivitasData(); // supaya summary log ikut update
            } else {
                alert(json.msg || '❌ Gagal menyimpan transfer!');
            }
        } catch (err) {
            console.error('❌ Error saat transfer:', err);
            alert('Terjadi kesalahan saat mengirim transfer.');
        }
    }
    
    
    function loadTransferData() {
        loadRiwayatTransfer().then(() => {
            updateTotalTransferHariIni();
        });
    }
    
    async function loadRiwayatTransfer() {
        try {
            const res = await fetch('api.php', {
                method: 'POST',
                body: new URLSearchParams({ action: 'get_transfer' }),
                credentials: 'include'
            });
    
            // Ambil response mentah untuk debug
            const text = await res.text();
            let result;
            try {
                result = JSON.parse(text);
            } catch (err) {
                console.error('❌ Respon bukan JSON valid:', text);
                alert('Server mengirim data bukan JSON, cek console.');
                return;
            }
    
            // Pastikan transferData array
            transferData = Array.isArray(result) ? result : [];
    
            // ✅ Fungsi ambil tanggal saja (YYYY-MM-DD) tanpa konversi timezone
            const getDateOnly = (dateStr) => dateStr.substring(0, 10);
    
            const today = getDateOnly(new Date().toISOString()); // Tanggal hari ini
            const todayTransfer = transferData.filter(t => getDateOnly(t.tanggal) === today);
    
            const container = document.getElementById('riwayatTransfer');
            container.innerHTML = '';
    
            if (todayTransfer.length === 0) {
                container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada transfer hari ini</p>';
            } else {
                todayTransfer.forEach(transfer => {
                    const div = document.createElement('div');
                    div.className = 'bg-gray-50 rounded-lg p-4';
                    div.innerHTML = `
                        <div class="flex justify-between items-start">
                            <div>
                                <h4 class="font-semibold text-gray-800">${transfer.dariAplikasi} → ${transfer.keAplikasi}</h4>
                                <p class="text-sm text-gray-600">Transfer: Rp ${transfer.jumlahTransfer.toLocaleString()}</p>
                                <p class="text-sm text-gray-600">Diterima: Rp ${transfer.jumlahDiterima.toLocaleString()}</p>
                                ${transfer.biayaAdmin > 0 ? `<p class="text-sm text-red-600">Admin: Rp ${transfer.biayaAdmin.toLocaleString()}</p>` : ''}
                                ${transfer.keterangan ? `<p class="text-xs text-gray-500">${transfer.keterangan}</p>` : ''}
                                <p class="text-xs text-gray-500">${new Date(transfer.tanggal).toLocaleTimeString()} • ${transfer.user || 'System'}</p>
                            </div>
                            <div class="text-right">
                                <p class="font-bold text-purple-600">Rp ${transfer.jumlahDiterima.toLocaleString()}</p>
                            </div>
                        </div>
                    `;
                    container.appendChild(div);
                });
            }
    
            // ✅ Update total transfer & biaya admin hari ini
            const totalTransfer = todayTransfer.reduce((sum, t) => sum + t.jumlahDiterima, 0);
            const totalBiayaAdmin = todayTransfer.reduce((sum, t) => sum + t.biayaAdmin, 0);
    
            document.getElementById('totalTransferHariIni').textContent = `Rp ${totalTransfer.toLocaleString()}`;
            document.getElementById('totalBiayaAdmin').textContent = `Rp ${totalBiayaAdmin.toLocaleString()}`;
    
        } catch (err) {
            console.error('❌ Gagal memuat riwayat transfer:', err);
            transferData = [];
        }
    }
        
    function updateTotalTransferHariIni() {
        // Pastikan transferData array
        const data = Array.isArray(transferData) ? transferData : [];
    
        // Fungsi ambil tanggal saja (YYYY-MM-DD) tanpa pengaruh timezone
        const getDateOnly = (dateStr) => dateStr.substring(0, 10);
    
        // Tanggal hari ini (lokal browser)
        const today = getDateOnly(new Date().toISOString());
    
        // Filter transaksi hari ini
        const todayTransfer = data.filter(t => getDateOnly(t.tanggal) === today);
    
        // Hitung total transfer & total biaya admin
        const totalTransfer = todayTransfer.reduce((sum, t) => sum + t.jumlahDiterima, 0);
        const totalBiayaAdmin = todayTransfer.reduce((sum, t) => sum + t.biayaAdmin, 0);
    
        // Tampilkan di HTML
        document.getElementById('totalTransferHariIni').textContent = `Rp ${totalTransfer.toLocaleString()}`;
        document.getElementById('totalBiayaAdmin').textContent = `Rp ${totalBiayaAdmin.toLocaleString()}`;
    }
    
        // Transfer Saldo Functions
        async function loadLogAktivitasData() {
            const tbody = document.getElementById('logAktivitasTableBody');
            if (!tbody) return;
            
            tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">Memuat data log...</td></tr>';
        
            try {
                // Ambil log aktivitas dari MySQL
                const res = await fetch('api.php?action=get_log_aktivitas', { credentials: 'include' });
                const logs = await res.json();
        
                tbody.innerHTML = '';
        
                if (!Array.isArray(logs) || logs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-gray-500">Belum ada log aktivitas</td></tr>';
                    return;
                }
        
                logs.forEach(log => {
                    const tr = document.createElement('tr');
                    tr.className = 'border-b hover:bg-gray-50';
        
                    const tgl = new Date(log.tanggal);
                    const tglFormatted = tgl.toLocaleDateString('id-ID');
                    const jamFormatted = tgl.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        
                    tr.innerHTML = `
                        <td class="px-4 py-3">
                            <div class="text-sm font-medium">${tglFormatted}</div>
                            <div class="text-xs text-gray-500">${jamFormatted}</div>
                        </td>
                        <td class="px-4 py-3">${log.jenis}</td>
                        <td class="px-4 py-3">${log.deskripsi}</td>
                        <td class="px-4 py-3">${log.detail || '-'}</td>
                        <td class="px-4 py-3">${log.user || 'System'}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } catch (err) {
                console.error('❌ Gagal memuat log aktivitas:', err);
                tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-6 text-center text-red-500">Gagal memuat log aktivitas dari server</td></tr>';
            }
        }
        
        
        
        function updateLogSummary() {
            const transferCount = filteredLogData.filter(log => log.jenis === 'transfer').length;
            const belanjaCount = filteredLogData.filter(log => log.jenis === 'belanja').length;
            const stokCount = filteredLogData.filter(log => log.jenis === 'stok').length;
            const editCount = filteredLogData.filter(log => log.jenis === 'edit_barang').length;
        
            document.getElementById('totalLogTransfer').textContent = transferCount;
            document.getElementById('totalLogBelanja').textContent = belanjaCount;
            document.getElementById('totalLogStok').textContent = stokCount;
            document.getElementById('totalLogEdit').textContent = editCount;
        }
        
        function loadLogTable() {
            const tbody = document.getElementById('logAktivitasTableBody');
            tbody.innerHTML = '';
        
            const startIndex = (currentLogPage - 1) * logItemsPerPage;
            const endIndex = startIndex + logItemsPerPage;
            const pageData = filteredLogData.slice(startIndex, endIndex);
        
            if (pageData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="px-4 py-8 text-center text-gray-500">Tidak ada data aktivitas</td></tr>';
                updateLogPagination();
                return;
            }
        
            const jenisColors = {
                'transfer': 'bg-blue-100 text-blue-800',
                'belanja': 'bg-red-100 text-red-800',
                'stok': 'bg-purple-100 text-purple-800',
                'edit_barang': 'bg-green-100 text-green-800',
                'transaksi': 'bg-yellow-100 text-yellow-800',
                'saldo': 'bg-gray-100 text-gray-800'
            };
        
            const jenisLabels = {
                'transfer': 'Transfer Saldo',
                'belanja': 'Belanja',
                'stok': 'Tambah Stok',
                'edit_barang': 'Edit Barang',
                'transaksi': 'Transaksi',
                'saldo': 'Update Saldo'
            };
        
            pageData.forEach(log => {
                const tr = document.createElement('tr');
                tr.className = 'border-b hover:bg-gray-50';
                tr.innerHTML = `
                    <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900">${new Date(log.tanggal).toLocaleDateString('id-ID')}</div>
                        <div class="text-xs text-gray-500">${new Date(log.tanggal).toLocaleTimeString('id-ID')}</div>
                    </td>
                    <td class="px-4 py-3">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full ${jenisColors[log.jenis] || 'bg-gray-100 text-gray-800'}">
                            ${jenisLabels[log.jenis] || log.jenis}
                        </span>
                    </td>
                    <td class="px-4 py-3">
                        <div class="text-sm text-gray-900">${log.deskripsi}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="text-sm text-gray-600 max-w-xs truncate" title="${log.detail}">${log.detail}</div>
                    </td>
                    <td class="px-4 py-3">
                        <div class="text-sm font-medium text-gray-900">${log.user || currentUser || 'System'}</div>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        
            updateLogPagination();
        }
        
        function updateLogPagination() {
            const totalItems = filteredLogData.length;
            const totalPages = Math.ceil(totalItems / logItemsPerPage);
            const startItem = (currentLogPage - 1) * logItemsPerPage + 1;
            const endItem = Math.min(currentLogPage * logItemsPerPage, totalItems);
        
            document.getElementById('logShowingStart').textContent = totalItems > 0 ? startItem : 0;
            document.getElementById('logShowingEnd').textContent = endItem;
            document.getElementById('logTotalItems').textContent = totalItems;
            document.getElementById('currentPageInfo').textContent = `Halaman ${currentLogPage} dari ${totalPages}`;
        
            const prevBtn = document.getElementById('prevPageBtn');
            const nextBtn = document.getElementById('nextPageBtn');
        
            prevBtn.disabled = currentLogPage <= 1;
            nextBtn.disabled = currentLogPage >= totalPages;
        
            prevBtn.classList.toggle('opacity-50', prevBtn.disabled);
            prevBtn.classList.toggle('cursor-not-allowed', prevBtn.disabled);
            nextBtn.classList.toggle('opacity-50', nextBtn.disabled);
            nextBtn.classList.toggle('cursor-not-allowed', nextBtn.disabled);
        }
        
        function nextPageLog() {
            const totalPages = Math.ceil(filteredLogData.length / logItemsPerPage);
            if (currentLogPage < totalPages) {
                currentLogPage++;
                loadLogTable();
            }
        }
        
        function prevPageLog() {
            if (currentLogPage > 1) {
                currentLogPage--;
                loadLogTable();
            }
        }
        
        function filterLogAktivitas() {
            const jenisFilter = document.getElementById('filterJenisAktivitas').value;
            const tanggalFilter = document.getElementById('filterTanggalLog').value;
        
            filteredLogData = logAktivitasData.filter(log => {
                const jenisMatch = !jenisFilter || log.jenis === jenisFilter;
                const tanggalMatch = !tanggalFilter || new Date(log.tanggal).toISOString().split('T')[0] === tanggalFilter;
                return jenisMatch && tanggalMatch;
            });
        
            currentLogPage = 1;
            updateLogSummary();
            loadLogTable();
        }
        
        function clearFilterLog() {
            document.getElementById('filterJenisAktivitas').value = '';
            document.getElementById('filterTanggalLog').value = '';
            filteredLogData = [...logAktivitasData];
            currentLogPage = 1;
            updateLogSummary();
            loadLogTable();
        }

        











  
        // Edit transaksi function
        // =====================================
// EDIT TRANSAKSI KE MYSQL
// =====================================
async function editTransaksi(id) {
    const transaksi = transaksiData.find(t => t.id == id);
    if (!transaksi) {
        alert('Transaksi tidak ditemukan!');
        return;
    }

    const newNominal = prompt(
        `Edit nominal transaksi:\nTransaksi: ${transaksi.nama_item || transaksi.namaItem}\nNominal saat ini: Rp ${parseFloat(transaksi.nominal).toLocaleString()}`,
        transaksi.nominal
    );
    if (newNominal === null) return; // User cancel

    const nominalValue = parseFloat(newNominal);
    if (isNaN(nominalValue) || nominalValue <= 0) {
        alert('Masukkan nominal yang valid!');
        return;
    }

    const newKeuntungan = prompt(
        `Edit keuntungan transaksi:\nKeuntungan saat ini: Rp ${parseFloat(transaksi.keuntungan).toLocaleString()}`,
        transaksi.keuntungan
    );
    if (newKeuntungan === null) return; // User cancel

    const keuntunganValue = parseFloat(newKeuntungan);
    if (isNaN(keuntunganValue)) {
        alert('Masukkan keuntungan yang valid!');
        return;
    }

    if (!confirm(
        `Konfirmasi edit transaksi:\n` +
        `Nama: ${transaksi.nama_item || transaksi.namaItem}\n` +
        `Nominal: Rp ${nominalValue.toLocaleString()}\n` +
        `Keuntungan: Rp ${keuntunganValue.toLocaleString()}`
    )) {
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'edit_transaksi',
                id: id,
                nominal: nominalValue,
                keuntungan: keuntunganValue
            }),
            credentials: 'include'
        });

        const json = await res.json();
        if (json.success) {
            alert('✅ Transaksi berhasil diperbarui!');
            await loadLaporanData();
            await loadRiwayatTransaksi();
            updateTotalHariIni();
        } else {
            alert(json.msg || '❌ Gagal mengupdate transaksi!');
        }
    } catch (err) {
        console.error('❌ Error saat update transaksi:', err);
        alert('Terjadi kesalahan koneksi ke server.');
    }
}

// =====================================
// DELETE TRANSAKSI KE MYSQL
// =====================================
async function deleteTransaksi(id) {
    const transaksi = transaksiData.find(t => t.id == id);
    if (!transaksi) {
        alert('Transaksi tidak ditemukan!');
        return;
    }

    if (!confirm(
        `Yakin ingin menghapus transaksi ini?\n` +
        `Nama: ${transaksi.nama_item || transaksi.namaItem}\n` +
        `Nominal: Rp ${parseFloat(transaksi.nominal).toLocaleString()}\n` +
        `Tanggal: ${new Date(transaksi.tanggal).toLocaleDateString('id-ID')}`
    )) {
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'delete_transaksi',
                id: id
            }),
            credentials: 'include'
        });

        const json = await res.json();
        if (json.success) {
            alert('✅ Transaksi berhasil dihapus!');
            await loadLaporanData();
            await loadRiwayatTransaksi();
            updateTotalHariIni();
            await loadBarangData(); // untuk update stok aksesoris
        } else {
            alert(json.msg || '❌ Gagal menghapus transaksi!');
        }
    } catch (err) {
        console.error('❌ Error saat hapus transaksi:', err);
        alert('Terjadi kesalahan koneksi ke server.');
    }
}

        







// Kasir Management Functions
async function tambahKasir() {
    const username = document.getElementById('newKasirUsername').value.trim();
    const password = document.getElementById('newKasirPassword').value.trim();
    const nama = document.getElementById('newKasirNama').value.trim();

    if (!username || !password || !nama) {
        alert('Lengkapi semua data kasir!');
        return;
    }

    // Cek apakah username sudah dipakai (ambil dari userData global, sudah di-load sebelumnya)
    if (userData.find(u => u.username === username)) {
        alert('Username sudah digunakan!');
        return;
    }

    try {
        const res = await fetch('api.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'add_user',
                username,
                password,
                nama
            }),
            credentials: 'include'
        });

        const json = await res.json();
        if (json.success) {
            logActivity('edit_barang', `Tambah kasir baru: ${nama}`, `Username: ${username}`);

            document.getElementById('newKasirUsername').value = '';
            document.getElementById('newKasirPassword').value = '';
            document.getElementById('newKasirNama').value = '';

            await loadKelolaKasirData();
            alert('Kasir baru berhasil ditambahkan!');
        } else {
            alert(json.msg || 'Gagal menambahkan kasir.');
        }
    } catch (err) {
        console.error('❌ Error tambah kasir:', err);
        alert('Terjadi kesalahan koneksi ke server.');
    }
}


async function loadKelolaKasirData() {
    const container = document.getElementById('daftarKasir');
    container.innerHTML = '<p class="text-gray-500 text-center py-4">Memuat data kasir...</p>';

    try {
        const res = await fetch('api.php?action=get_users', { credentials: 'include' });
        const users = await res.json();

        if (!Array.isArray(users)) {
            console.error('❌ Respon get_users bukan array:', users);
            container.innerHTML = '<p class="text-red-500 text-center py-4">Gagal memuat data kasir (respon tidak valid)</p>';
            return;
        }

        // Simpan ke variabel global jika fungsi lain membutuhkannya
        userData = users;

        const kasirList = users.filter(u => u.role === 'kasir');
        container.innerHTML = '';

        if (kasirList.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada kasir yang terdaftar</p>';
            return;
        }

        kasirList.forEach(kasir => {
            const div = document.createElement('div');
            div.className = 'bg-gray-50 rounded-lg p-4';
            div.innerHTML = `
                <div class="flex justify-between items-center">
                    <div>
                        <h4 class="font-semibold text-gray-800">${kasir.nama}</h4>
                        <p class="text-sm text-gray-600">Username: ${kasir.username}</p>
                        <p class="text-xs text-gray-500">Role: ${kasir.role}</p>
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="editKasir('${kasir.username}')" class="text-blue-600 hover:text-blue-800 text-sm px-3 py-1 rounded border border-blue-300 hover:bg-blue-50">
                            ✏️ Edit
                        </button>
                        <button onclick="deleteKasir('${kasir.username}')" class="text-red-600 hover:text-red-800 text-sm px-3 py-1 rounded border border-red-300 hover:bg-red-50">
                            🗑️ Hapus
                        </button>
                    </div>
                </div>
            `;
            container.appendChild(div);
        });

        // Panggil fungsi filter jika ada
        updateKasirFilter(); // atau updateKasirFilter(users) jika memang butuh parameter

    } catch (err) {
        console.error('❌ Gagal memuat data kasir:', err);
        container.innerHTML = '<p class="text-red-500 text-center py-4">Gagal memuat data kasir dari server</p>';
    }
}



async function editKasir(username) {
    // Ambil nama kasir dari DOM berdasarkan username
    const card = [...document.querySelectorAll('#daftarKasir .bg-gray-50')]
        .find(div => div.innerHTML.includes(`Username: ${username}`));
    const currentName = card ? card.querySelector('h4').textContent.trim() : username;

    // Prompt input nama baru
    const newNama = prompt(`Edit nama kasir:\nNama saat ini: ${currentName}`, currentName);
    if (newNama === null || !newNama.trim()) return;

    // Prompt input password baru (opsional)
    const newPassword = prompt('Edit password kasir (kosongkan jika tidak ingin mengubah password)');
    if (newPassword === null) return;

    const formData = new FormData();
    formData.append('action', 'edit_kasir');
    formData.append('username', username);
    formData.append('nama', newNama.trim());
    if (newPassword.trim()) {
        formData.append('password', newPassword.trim());
    }

    try {
        const res = await fetch('api.php', { method: 'POST', body: formData, credentials: 'include' });
        const json = await res.json();

        if (json.success) {
            // ✅ Tambahkan log aktivitas (harus backend handle)
            logActivity('edit_barang', `Edit kasir: ${newNama}`, `Username: ${username}`);

            alert('✅ Data kasir berhasil diperbarui!');
            loadKelolaKasirData();
        } else {
            alert(json.message || '❌ Gagal mengupdate kasir!');
        }
    } catch (err) {
        console.error('❌ Error edit kasir:', err);
        alert('Terjadi kesalahan koneksi.');
    }
}


async function deleteKasir(username) {
    // Ambil nama dari DOM untuk konfirmasi
    const card = [...document.querySelectorAll('#daftarKasir .bg-gray-50')]
        .find(div => div.innerHTML.includes(`Username: ${username}`));
    const currentName = card ? card.querySelector('h4').textContent.trim() : username;

    // Konfirmasi hapus
    if (!confirm(`Yakin ingin menghapus kasir?\nNama: ${currentName}\nUsername: ${username}`)) return;

    const formData = new FormData();
    formData.append('action', 'delete_kasir');
    formData.append('username', username);

    try {
        const res = await fetch('api.php', { method: 'POST', body: formData, credentials: 'include' });
        const json = await res.json();

        if (json.success) {
            // ✅ Log aktivitas frontend (opsional)
            logActivity('edit_barang', `Hapus kasir: ${currentName}`, `Username: ${username}`);

            alert('✅ Kasir berhasil dihapus!');
            loadKelolaKasirData();
        } else {
            alert(json.message || '❌ Gagal menghapus kasir!');
        }
    } catch (err) {
        console.error('❌ Error hapus kasir:', err);
        alert('Terjadi kesalahan koneksi.');
    }
}



// 🔹 Update dropdown filter kasir
function updateKasirFilter(users = []) {
    const filterSelect = document.getElementById('filterKasir');
    if (!filterSelect) return;

    filterSelect.innerHTML = '<option value="">Semua Kasir</option>';

    const kasirList = users.length > 0
        ? users.filter(u => u.role === 'kasir')
        : userData.filter(u => u.role === 'kasir');

    kasirList.forEach(kasir => {
        const option = document.createElement('option');
        option.value = kasir.username;
        option.textContent = kasir.nama;
        filterSelect.appendChild(option);
    });
}




// 🔹 Fungsi utama untuk load data kasir & transaksi
async function loadLaporanKasirData() {
    const filterSelect = document.getElementById('filterKasir');
    if (filterSelect) {
        filterSelect.innerHTML = '<option value="">Memuat kasir...</option>';
    }

    try {
        const res = await fetch('api.php?action=get_users', { credentials: 'include' });
        const users = await res.json();

        if (!Array.isArray(users)) {
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="">Gagal memuat kasir</option>';
            }
            return;
        }

        userData = users;                  // simpan global
        updateKasirFilter(users);          // update filter
        loadLaporanKasir();                // tampilkan laporan
    } catch (err) {
        if (filterSelect) {
            filterSelect.innerHTML = '<option value="">Gagal memuat kasir</option>';
        }
    }
}

async function loadLaporanKasir() {
    const selectedKasir = document.getElementById('filterKasir')?.value || '';
    const tanggalFilter = document.getElementById('tanggalFilter')?.value || '';

    const params = new URLSearchParams();
    params.append('action', 'get_transaksi');

    if (selectedKasir) {
        params.append('user', selectedKasir);
    }

    if (tanggalFilter) {
        params.append('start', tanggalFilter); // support filter per tanggal
    }

    try {
        const res = await fetch(`api.php?${params.toString()}`, {
            credentials: 'include'
        });

        const text = await res.text();
        let transaksi;

        try {
            transaksi = JSON.parse(text);
        } catch (e) {
            console.error('❌ Gagal parse JSON transaksi:', text);
            alert('Gagal memuat laporan kasir (respon tidak valid)');
            return;
        }

        if (!Array.isArray(transaksi)) {
            console.error('❌ Respon get_transaksi bukan array:', transaksi);
            alert('Gagal memuat laporan kasir (data bukan array)');
            return;
        }

        // Kirim ke fungsi untuk render ke tabel
        // Tambahkan ini setelah `loadLaporanKasirTable(transaksi)`
        const tanggal = tanggalFilter || new Date().toISOString().split('T')[0];
        loadPerformanceKasirCards(tanggal);

        loadLaporanKasirTable(transaksi);

    } catch (err) {
        console.error('❌ Error fetch transaksi:', err);
        alert('Gagal terhubung ke server saat memuat laporan kasir.');
    }
}





// 🔹 Render kartu performa kasir
async function loadPerformanceKasirCards(filterTanggal = '') {
    const container = document.getElementById('performanceKasirCards');
    container.innerHTML = '<p class="text-gray-500 text-center py-4">Memuat data performa kasir...</p>';

    try {
        // Ambil data kasir
        const userRes = await fetch('api.php?action=get_users', { credentials: 'include' });
        const users = await userRes.json();

        if (!Array.isArray(users)) throw new Error('Data user tidak valid');

        // Ambil data transaksi
        const transRes = await fetch('api.php?action=get_transaksi', { credentials: 'include' });
        const transaksiData = await transRes.json();

        if (!Array.isArray(transaksiData)) throw new Error('Data transaksi tidak valid');

        // Filter kasir
        const kasirList = users.filter(u => u.role === 'kasir');

        container.innerHTML = '';

        kasirList.forEach(kasir => {
            let kasirTransaksi = transaksiData.filter(t => t.user === kasir.username);

            // Filter by tanggal jika dipilih
            if (filterTanggal) {
                kasirTransaksi = kasirTransaksi.filter(t => {
                    const tanggal = new Date(t.tanggal).toISOString().split('T')[0];
                    return tanggal === filterTanggal;
                });
            }

            const totalTransaksi = kasirTransaksi.length;
            const totalPenjualan = kasirTransaksi.reduce((sum, t) => sum + Number(t.nominal), 0);
            const totalKeuntungan = kasirTransaksi.reduce((sum, t) => sum + Number(t.keuntungan), 0);
            const rataRata = totalTransaksi > 0 ? Math.round(totalPenjualan / totalTransaksi) : 0;

            const card = document.createElement('div');
            card.className = 'bg-white rounded-xl shadow-lg p-6';
            card.innerHTML = `
                <div class="flex items-center mb-4">
                    <div class="bg-blue-100 rounded-full p-3 mr-4">
                        <span class="text-2xl">👤</span>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-800">${kasir.nama}</h3>
                        <p class="text-sm text-gray-600">@${kasir.username}</p>
                    </div>
                </div>
                
                <div class="space-y-3">
                    <div class="flex justify-between">
                        <span class="text-sm text-gray-600">Transaksi:</span>
                        <span class="font-semibold">${totalTransaksi}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm text-gray-600">Penjualan:</span>
                        <span class="font-semibold text-green-600">Rp ${totalPenjualan.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm text-gray-600">Keuntungan:</span>
                        <span class="font-semibold text-blue-600">Rp ${totalKeuntungan.toLocaleString()}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-sm text-gray-600">Rata-rata/Transaksi:</span>
                        <span class="font-semibold text-purple-600">Rp ${rataRata.toLocaleString()}</span>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        if (kasirList.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-4">Belum ada kasir yang terdaftar</p>';
        }

    } catch (err) {
        console.error('❌ Gagal memuat performa kasir:', err);
        container.innerHTML = '<p class="text-red-500 text-center py-4">Gagal memuat data dari server</p>';
    }
}


// 🔹 Render tabel laporan kasir
function loadLaporanKasirTable(filteredTransaksi) {
    const tbody = document.getElementById('laporanKasirTableBody');
    tbody.innerHTML = '';

    if (!Array.isArray(filteredTransaksi) || filteredTransaksi.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-gray-500">
                    Tidak ada data transaksi
                </td>
            </tr>
        `;
        return;
    }

    filteredTransaksi.forEach(transaksi => {
        // Ambil nama kasir dari properti 'kasir' (disediakan oleh backend)
        const kasirNama = transaksi.kasir || transaksi.user || 'Unknown';

        const tr = document.createElement('tr');
        tr.className = 'border-b hover:bg-gray-50';

        const tanggalObj = new Date(transaksi.tanggal);
        const tanggalFormatted = tanggalObj.toLocaleDateString('id-ID');
        const jamFormatted = tanggalObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        tr.innerHTML = `
            <td class="px-4 py-3">
                <div class="font-medium text-gray-900">${kasirNama}</div>
                <div class="text-xs text-gray-500">@${transaksi.user || 'unknown'}</div>
            </td>
            <td class="px-4 py-3">
                <div class="text-sm font-medium">${tanggalFormatted}</div>
                <div class="text-xs text-gray-500">${jamFormatted}</div>
            </td>
            <td class="px-4 py-3">${transaksi.jenis}</td>
            <td class="px-4 py-3">${transaksi.namaItem}</td>
            <td class="px-4 py-3">Rp ${Number(transaksi.nominal).toLocaleString()}</td>
            <td class="px-4 py-3">Rp ${Number(transaksi.keuntungan).toLocaleString()}</td>
            <td class="px-4 py-3">${transaksi.metodePembayaran}</td>
        `;
        tbody.appendChild(tr);
    });
}
















document.addEventListener('DOMContentLoaded', function () {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayStr = today.toISOString().split('T')[0];
    const firstDayStr = firstDay.toISOString().split('T')[0];

    // Atur default tanggal untuk laporan transaksi
    const tanggalMulai = document.getElementById('tanggalMulai');
    const tanggalAkhir = document.getElementById('tanggalAkhir');
    if (tanggalMulai) tanggalMulai.value = firstDayStr;
    if (tanggalAkhir) tanggalAkhir.value = todayStr;

    // Atur default tanggal untuk laporan belanja
    const tanggalMulaiBelanja = document.getElementById('tanggalMulaiBelanja');
    const tanggalAkhirBelanja = document.getElementById('tanggalAkhirBelanja');
    if (tanggalMulaiBelanja) tanggalMulaiBelanja.value = firstDayStr;
    if (tanggalAkhirBelanja) tanggalAkhirBelanja.value = todayStr;

    // Atur default tanggal untuk laporan kasir
    const filterTanggalKasir = document.getElementById('filterTanggalKasir');
    if (filterTanggalKasir) filterTanggalKasir.value = todayStr;

    // Inisialisasi laporan kasir (jika diinginkan)
    if (document.getElementById('laporan-kasirTab')) {
        loadLaporanKasirData(); // atau loadLaporanKasir() jika hanya ingin fetch data kasir
    }

    console.log('🟢 VSSTORE Sistem Siap (MySQL version)');
});


    async function kirimKeWhatsApp() {
        const today = new Date().toISOString().split('T')[0];

        // 1️⃣ Ambil data saldo hari ini dari backend
        let saldoHariIni = {};
        try {
            const res = await fetch(`api.php?action=get_saldo&tanggal=${today}`, { credentials: 'include' });
            const json = await res.json();

            if (json.success && json.data) {
                saldoHariIni = json.data;
            } else {
                alert('Gagal mengambil data saldo dari server.');
                return;
            }
        } catch (err) {
            console.error('❌ Error ambil saldo:', err);
            alert('Terjadi kesalahan saat mengambil saldo.');
            return;
        }

        // 2️⃣ Daftar aplikasi
        const aplikasiList = [
            { key: 'Tunai', label: '💵 Tunai (Cash)' },
            { key: 'Brimo', label: '🏦 Brimo (BRI Mobile)' },
            { key: 'Dana', label: '💳 Dana' },
            { key: 'Gopay', label: '🟢 Gopay' },
            { key: 'VSSTORE', label: '🏪 VSSTORE' },
            { key: 'RITA', label: '📱 RITA' },
            { key: 'VIVAapps', label: '🔵 VIVAapps' },
            { key: 'Digipos', label: '🖥️ Digipos' },
            { key: 'Simpel', label: '🔴 Simpel' },
            { key: 'SiDompul', label: '🟡 SiDompul' },
            { key: 'SeaBank', label: '🌊 SeaBank' }
        ];

        // 3️⃣ Format pesan
        let message = `📊 *LAPORAN SALDO APLIKASI*\n`;
        message += `📅 Tanggal: ${new Date().toLocaleDateString('id-ID')}\n`;
        message += `⏰ Waktu: ${new Date().toLocaleTimeString('id-ID')}\n`;
        message += `👤 Dilaporkan oleh: ${currentUser || 'System'}\n\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        let totalSaldo = 0;
        let saldoPositif = 0;
        let saldoKosong = 0;

        aplikasiList.forEach(app => {
            const saldo = parseFloat(saldoHariIni[app.key] || 0);
            totalSaldo += saldo;

            if (saldo > 0) {
                saldoPositif++;
                message += `${app.label}\n💰 Rp ${saldo.toLocaleString()}\n\n`;
            } else {
                saldoKosong++;
                message += `${app.label}\n❌ Rp 0 (Kosong)\n\n`;
            }
        });

        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `📈 *RINGKASAN SALDO*\n`;
        message += `💎 Total Saldo: *Rp ${totalSaldo.toLocaleString()}*\n`;
        message += `✅ Aplikasi Berisi: ${saldoPositif} dari ${aplikasiList.length}\n`;
        message += `⚠️ Aplikasi Kosong: ${saldoKosong} aplikasi\n\n`;

        const persentaseBerisi = ((saldoPositif / aplikasiList.length) * 100).toFixed(1);
        message += `📊 Persentase Aplikasi Berisi: ${persentaseBerisi}%\n\n`;

        if (saldoKosong > 0) {
            message += `⚠️ *PERHATIAN:*\n`;
            message += `Ada ${saldoKosong} aplikasi yang saldo kosong.\n`;
            message += `Pertimbangkan untuk melakukan top up.\n\n`;
        }

        if (totalSaldo < 1000000) {
            message += `🔔 *REKOMENDASI:*\n`;
            message += `Total saldo di bawah Rp 1.000.000.\n`;
            message += `Disarankan untuk menambah saldo.\n\n`;
        }

        message += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🏪 *VSSTORE - Sistem Kasir Digital*\n`;
        message += `🌐 vsstore.id | 📱 Solusi Pembayaran Digital Terpercaya`;

        // 4️⃣ Copy ke clipboard
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(message)
                .then(() => showWhatsAppInstructions(message))
                .catch(() => showWhatsAppFallback(message));
        } else {
            showWhatsAppFallback(message);
        }

        // 5️⃣ Log aktivitas
        logActivity('saldo', 'Kirim laporan saldo ke WhatsApp', `Total saldo: Rp ${totalSaldo.toLocaleString()}, ${saldoPositif} aplikasi berisi`);
        const nomorWA = '6285838297020'; // gunakan format internasional (62 untuk Indonesia)
        const waUrl = `https://wa.me/${nomorWA}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank');

    }


    function showWhatsAppInstructions(message) {
        // Escape HTML untuk preview (prevent XSS di innerHTML)
        const escapeHTML = str => str.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    
        // Cegah duplikasi modal
        const existing = document.getElementById('whatsappModal');
        if (existing) existing.remove();
    
        const modal = document.createElement('div');
        modal.id = 'whatsappModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800 flex items-center">
                        <span class="text-2xl mr-2">📱</span>
                        Kirim ke WhatsApp
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center mb-2">
                        <span class="text-green-600 text-lg mr-2">✅</span>
                        <span class="font-semibold text-green-800">Pesan berhasil disalin ke clipboard!</span>
                    </div>
                    <p class="text-sm text-green-700">Ikuti langkah-langkah berikut untuk mengirim laporan:</p>
                </div>
    
                <div class="space-y-4">
                    ${[1, 2, 3, 4].map(step => {
                        const steps = [
                            ["Buka WhatsApp", "Buka aplikasi WhatsApp di ponsel atau WhatsApp Web di browser"],
                            ["Pilih kontak atau grup", "Pilih kontak atau grup yang ingin Anda kirimi laporan saldo"],
                            ["Paste pesan", "Tekan dan tahan di kolom pesan, lalu pilih 'Paste' atau tekan Ctrl+V"],
                            ["Kirim pesan", "Tekan tombol kirim untuk mengirim laporan saldo"]
                        ];
                        const [title, desc] = steps[step - 1];
                        return `
                            <div class="flex items-start space-x-3">
                                <div class="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center text-blue-600 font-bold text-sm">${step}</div>
                                <div>
                                    <p class="font-semibold text-gray-800">${title}</p>
                                    <p class="text-sm text-gray-600">${desc}</p>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
    
                <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                    <p class="text-sm text-gray-600 mb-2"><strong>Preview pesan:</strong></p>
                    <div class="bg-white border rounded p-3 text-xs font-mono max-h-32 overflow-y-auto whitespace-pre-wrap">
                        ${escapeHTML(message.substring(0, 200))}...
                    </div>
                </div>
    
                <div class="mt-6 flex justify-between">
                    <button onclick="copyMessageAgain(\`${message.replace(/`/g, '\\`')}\`); this.textContent='Disalin!'; setTimeout(() => this.textContent='Salin Ulang', 2000)" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors">
                        📋 Salin Ulang
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    }
    

    function showWhatsAppFallback(message) {
        // Escape karakter HTML untuk keamanan
        const escapeHTML = str => str.replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[m]));
    
        // Cegah duplikasi modal
        const existing = document.getElementById('whatsappFallbackModal');
        if (existing) existing.remove();
    
        // Buat elemen modal
        const modal = document.createElement('div');
        modal.id = 'whatsappFallbackModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-800 flex items-center">
                        <span class="text-2xl mr-2">📱</span>
                        Salin Pesan untuk WhatsApp
                    </h3>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-500 hover:text-gray-700 text-2xl">&times;</button>
                </div>
                
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <div class="flex items-center mb-2">
                        <span class="text-yellow-600 text-lg mr-2">ℹ️</span>
                        <span class="font-semibold text-yellow-800">Salin pesan di bawah ini</span>
                    </div>
                    <p class="text-sm text-yellow-700">Pilih semua teks, salin, lalu paste ke WhatsApp</p>
                </div>
    
                <textarea id="whatsappMessageText" class="w-full h-64 p-3 border border-gray-300 rounded-lg font-mono text-xs resize-none" readonly>${escapeHTML(message)}</textarea>
    
                <div class="mt-4 flex justify-between">
                    <button id="copyWAButton" class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors">
                        📋 Salin Pesan
                    </button>
                    <button onclick="this.closest('.fixed').remove()" class="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors">
                        Tutup
                    </button>
                </div>
            </div>
        `;
    
        document.body.appendChild(modal);
    
        // Event copy modern
        setTimeout(() => {
            const textarea = document.getElementById('whatsappMessageText');
            const button = document.getElementById('copyWAButton');
    
            textarea.select();
            textarea.setSelectionRange(0, 99999);
    
            button.addEventListener('click', async () => {
                try {
                    await navigator.clipboard.writeText(message);
                    button.textContent = 'Disalin!';
                    setTimeout(() => button.textContent = '📋 Salin Pesan', 2000);
                } catch (err) {
                    console.warn('Clipboard gagal, gunakan cara manual.');
                    document.execCommand('copy'); // fallback lama
                }
            });
        }, 100);
    }
    

    function copyMessageAgain(message) {
        if (navigator.clipboard?.writeText) {
            // Modern API (async)
            navigator.clipboard.writeText(message).then(() => {
                console.log('📋 Pesan berhasil disalin ke clipboard.');
            }).catch(err => {
                console.warn('❌ Clipboard gagal:', err);
                fallbackCopy(message);
            });
        } else {
            // Fallback lama
            fallbackCopy(message);
        }
    }
    
    function fallbackCopy(message) {
        const textArea = document.createElement('textarea');
        textArea.value = message;
        textArea.style.position = 'fixed'; // mencegah scroll ke bawah di iOS
        textArea.style.opacity = 0;
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
    
        try {
            const copied = document.execCommand('copy');
            console.log(copied ? '📋 Disalin via fallback.' : '⚠️ Gagal menyalin.');
        } catch (err) {
            console.error('❌ Fallback copy error:', err);
        }
    
        document.body.removeChild(textArea);
    }
    

    async function printSaldo() {
        // 🟢 Buka window sebelum await
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Popup diblokir! Izinkan pop-up untuk situs ini.');
            return;
        }
    
        const today = new Date().toISOString().split('T')[0];
        let saldoData = {};
    
        try {
            const res = await fetch(`api.php?action=get_saldo&tanggal=${today}`, { credentials: 'include' });
            const json = await res.json();
    
            if (!json.success || typeof json.data !== 'object') {
                printWindow.document.write('<p>Gagal mengambil data saldo.</p>');
                printWindow.document.close();
                return;
            }
    
            saldoData = json.data;
        } catch (err) {
            printWindow.document.write('<p>Terjadi kesalahan saat mengambil saldo.</p>');
            printWindow.document.close();
            return;
        }
    
        const aplikasiList = [
            { key: 'Tunai', label: 'Tunai (Cash)', icon: '💵' },
            { key: 'Brimo', label: 'Brimo (BRI Mobile)', icon: '🏦' },
            { key: 'Dana', label: 'Dana', icon: '💳' },
            { key: 'Gopay', label: 'Gopay', icon: '🟢' },
            { key: 'VSSTORE', label: 'VSSTORE', icon: '🏪' },
            { key: 'RITA', label: 'RITA', icon: '📱' },
            { key: 'VIVAapps', label: 'VIVAapps', icon: '🔵' },
            { key: 'Digipos', label: 'Digipos', icon: '🖥️' },
            { key: 'Simpel', label: 'Simpel', icon: '🔴' },
            { key: 'SiDompul', label: 'SiDompul', icon: '🟡' },
            { key: 'SeaBank', label: 'SeaBank', icon: '🌊' }
        ];
    
        let totalSaldo = 0;
        let saldoPositif = 0;
        let saldoKosong = 0;
        let printRows = '';
    
        aplikasiList.forEach((app, index) => {
            const saldo = parseFloat(saldoData[app.key] || 0);
            totalSaldo += saldo;
    
            if (saldo > 0) saldoPositif++;
            else saldoKosong++;
    
            const persentase = totalSaldo > 0 ? ((saldo / totalSaldo) * 100).toFixed(1) : '0.0';
            const statusClass = saldo > 0 ? 'saldo-positive' : 'saldo-zero';
            const statusText = saldo > 0 ? 'Aktif' : 'Kosong';
    
            printRows += `
                <tr>
                    <td style="text-align: center;">${index + 1}</td>
                    <td>${app.icon} ${app.label}</td>
                    <td class="${statusClass}" style="text-align: right;">${saldo.toLocaleString()}</td>
                    <td style="text-align: center;">${statusText}</td>
                    <td style="text-align: right;">${persentase}%</td>
                </tr>`;
        });
    
        const laporanTanggal = new Date().toLocaleDateString('id-ID', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    
        const laporanTime = new Date().toLocaleTimeString('id-ID');
        const rekomendasi = [];
    
        if (saldoKosong > 0) {
            rekomendasi.push(`<li>Terdapat ${saldoKosong} aplikasi dengan saldo kosong. Pertimbangkan untuk melakukan top up.</li>`);
        }
        if (totalSaldo < 1000000) {
            rekomendasi.push(`<li>Total saldo di bawah Rp 1.000.000. Disarankan untuk menambah saldo operasional.</li>`);
        }
        if (saldoPositif < aplikasiList.length * 0.7) {
            rekomendasi.push(`<li>Kurang dari 70% aplikasi memiliki saldo. Pertimbangkan distribusi saldo yang lebih merata.</li>`);
        }
    
        printWindow.document.write(`<!DOCTYPE html>
    <html><head><title>Laporan Saldo Aplikasi</title><style>
    @media print {@page {size: A4; margin: 15mm;} body {font-family:'Courier New', monospace; font-size:12px; line-height:1.4;}}
    body {font-family:'Courier New', monospace; font-size:12px; margin:0; padding:20px;}
    .header{text-align:center;border-bottom:2px solid #000;padding-bottom:10px;margin-bottom:20px;}
    .header h1{margin:0;font-size:18px;} .header p{margin:5px 0;font-size:11px;}
    .info-section{margin-bottom:20px;padding:10px;border:1px solid #000;}
    .info-row{display:flex;justify-content:space-between;margin-bottom:5px;}
    .saldo-table{width:100%;border-collapse:collapse;margin-bottom:20px;}
    .saldo-table th,.saldo-table td{border:1px solid #000;padding:8px;text-align:left;}
    .saldo-table th{background-color:#f0f0f0;font-weight:bold;}
    .saldo-positive{font-weight:bold;} .saldo-zero{color:#666;font-style:italic;}
    .summary{border:2px solid #000;padding:15px;background-color:#f9f9f9;}
    .summary h3{text-align:center;font-size:14px;margin:0 0 10px 0;}
    .summary-row{display:flex;justify-content:space-between;margin-bottom:8px;padding:3px 0;}
    .total-row{border-top:2px solid #000;padding-top:8px;margin-top:10px;font-weight:bold;font-size:14px;}
    .footer{margin-top:30px;text-align:center;font-size:10px;border-top:1px solid #000;padding-top:10px;}
    .recommendations{margin-top:20px;padding:10px;border:1px dashed #000;background-color:#fffacd;}
    .recommendations h4{margin:0 0 10px 0;font-size:12px;} .recommendations ul{padding-left:20px;} .recommendations li{margin-bottom:5px;}
    </style></head>
    <body>
    <div class="header">
        <h1>LAPORAN SALDO APLIKASI</h1>
        <p>VSSTORE - Sistem Kasir Digital</p>
        <p>vsstore.id | Solusi Pembayaran Digital Terpercaya</p>
    </div>
    
    <div class="info-section">
        <div class="info-row"><span><strong>Tanggal Laporan:</strong></span><span>${laporanTanggal}</span></div>
        <div class="info-row"><span><strong>Waktu Cetak:</strong></span><span>${laporanTime}</span></div>
        <div class="info-row"><span><strong>Dilaporkan oleh:</strong></span><span>${currentUser || 'System'} (${currentUserRole === 'admin' ? 'Administrator' : 'Kasir'})</span></div>
        <div class="info-row"><span><strong>Periode Saldo:</strong></span><span>${new Date(today).toLocaleDateString('id-ID')}</span></div>
    </div>
    
    <table class="saldo-table">
        <thead>
            <tr><th>No</th><th>Aplikasi/Platform</th><th>Saldo (Rp)</th><th>Status</th><th>Persentase</th></tr>
        </thead>
        <tbody>${printRows}</tbody>
    </table>
    
    <div class="summary">
        <h3>RINGKASAN SALDO</h3>
        <div class="summary-row"><span>Total Aplikasi:</span><span>${aplikasiList.length} platform</span></div>
        <div class="summary-row"><span>Aplikasi Berisi Saldo:</span><span>${saldoPositif} aplikasi</span></div>
        <div class="summary-row"><span>Aplikasi Saldo Kosong:</span><span>${saldoKosong} aplikasi</span></div>
        <div class="summary-row"><span>Persentase Aplikasi Aktif:</span><span>${((saldoPositif / aplikasiList.length) * 100).toFixed(1)}%</span></div>
        <div class="summary-row"><span>Rata-rata Saldo per Aplikasi:</span><span>Rp ${Math.round(totalSaldo / aplikasiList.length).toLocaleString()}</span></div>
        <div class="summary-row total-row"><span>TOTAL SALDO KESELURUHAN:</span><span>Rp ${totalSaldo.toLocaleString()}</span></div>
    </div>
    
    ${rekomendasi.length > 0 ? `
        <div class="recommendations">
            <h4>REKOMENDASI & CATATAN:</h4>
            <ul>${rekomendasi.join('')}</ul>
        </div>` : ''}
    
    <div class="footer">
        <p>Dokumen ini dicetak secara otomatis oleh sistem VSSTORE</p>
        <p>Kunjungi vsstore.id untuk informasi lebih lanjut</p>
        <p>© ${new Date().getFullYear()} VSSTORE - Sistem Kasir Digital | vsstore.id</p>
    </div>
    </body></html>`);
    
        printWindow.document.close();
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
        };
    
        logActivity('saldo', 'Print laporan saldo aplikasi', `Total saldo: Rp ${totalSaldo.toLocaleString()}, ${saldoPositif} aplikasi berisi`);
    
        alert(`✅ Laporan saldo siap dicetak!\n\n• Total Saldo: Rp ${totalSaldo.toLocaleString()}\n• Aplikasi Berisi: ${saldoPositif}/${aplikasiList.length}\n• Kosong: ${saldoKosong}\n\nSilakan pilih printer dan atur print sesuai kebutuhan.`);
    }
    
    

    function loadAllData() {
        loadBarang();
        loadSaldoData();
        loadRiwayatTransaksi();
        updateTotalHariIni();
        loadBelanjaData();
        loadTransferData();
        loadLogAktivitasData();
        loadLaporanData();
        loadLaporanKasir();
        loadKelolaKasirData();
        loadRiwayatTransfer();
    }
    






