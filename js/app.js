// Main Application JavaScript
document.addEventListener('DOMContentLoaded', function () {
    // Initialize the app
    initApp();

    // Firebase Auth Listener
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            // Check if local teacher session exists, if not, create from Firebase user
            let teacher = Storage.getTeacher();
            if (!teacher || teacher.email !== user.email) {
                // If the user name is not yet in Firebase auth, we'll try to get it from our local authorized list
                const authList = Storage.getAuthorizedTeachers();
                const localAuth = authList.find(t => t.email.toLowerCase() === user.email.toLowerCase());

                teacher = {
                    id: user.uid,
                    name: localAuth ? localAuth.name : user.displayName || 'Giáo viên',
                    email: user.email,
                    role: localAuth ? localAuth.role : 'teacher'
                };
                Storage.saveTeacher(teacher);
            }

            // High Priority: Pull data from cloud immediately after login
            await Storage.pullAllFromCloud();

            showAppContent();
            updateTeacherName(teacher.name);
            if (window.WordEngine) window.WordEngine.init();
            if (window.Mailbox) window.Mailbox.init();
        } else {
            showLoginPage();
        }
    });

    // One-time migration: Force update 10x10 to 10x6
    if (teacher) {
        const currentSettings = Storage.getGridSettings();
        if (currentSettings.rows === 10 && currentSettings.cols === 10 && currentSettings.size === 100) {
            Storage.saveGridSettings({ rows: 10, cols: 6, size: 100 });
        }
    }


    // Event Listeners
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const page = this.getAttribute('data-page');
            switchPage(page);
        });
    });

    // Modal close buttons
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function () {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });

    // Add student button
    const addStudentBtn = document.getElementById('addStudentBtn');
    if (addStudentBtn) {
        addStudentBtn.addEventListener('click', function () {
            document.getElementById('addStudentForm').reset();
            document.getElementById('editStudentId').value = '';
            document.getElementById('saveStudentBtn').textContent = 'Thêm học sinh';
            document.getElementById('avatarPreview').innerHTML = '<i class="fas fa-user"></i>';
            document.querySelector('#addStudentModal h3').textContent = 'Thêm học sinh mới';
            delete document.getElementById('addStudentModal').dataset.targetSeat;
            openModal('addStudentModal');
        });
    }

    // Avatar Upload Logic
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const fileInput = document.getElementById('newStudentAvatar');
    const avatarPreview = document.getElementById('avatarPreview');

    if (uploadBtn && fileInput) {
        uploadBtn.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', function (e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                    const base64 = event.target.result;
                    avatarPreview.innerHTML = `<img src="${base64}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
                    avatarPreview.dataset.base64 = base64;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Add class button
    document.getElementById('addClassBtn').addEventListener('click', function () {
        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        if (!schoolId) {
            alert('Vui lòng chọn hoặc thêm trường học trước!');
            return;
        }
        openModal('addClassModal');
    });

    // Add Attendance Button
    const addAttendanceBtn = document.getElementById('addAttendanceBtn');
    if (addAttendanceBtn) {
        addAttendanceBtn.addEventListener('click', addAttendanceColumn);
    }

    // Add subject button
    const addSubjectBtn = document.getElementById('addSubjectBtn');
    if (addSubjectBtn) {
        addSubjectBtn.addEventListener('click', function () {
            const schoolId = document.getElementById('schoolDropdown').dataset.value;
            if (!schoolId) {
                alert('Vui lòng chọn hoặc thêm trường học trước!');
                return;
            }
            openModal('addSubjectModal');
        });
    }

    // Add student form submission
    document.getElementById('addStudentForm').addEventListener('submit', handleAddStudent);

    // Add class form submission
    document.getElementById('addClassForm').addEventListener('submit', handleAddClass);

    // Add subject form submission
    const addSubjectForm = document.getElementById('addSubjectForm');
    if (addSubjectForm) {
        addSubjectForm.addEventListener('submit', handleAddSubject);
    }

    // Add school logic
    const addSchoolBtn = document.getElementById('addSchoolBtn');
    if (addSchoolBtn) {
        addSchoolBtn.addEventListener('click', () => openModal('addSchoolModal'));
    }

    const addSchoolForm = document.getElementById('addSchoolForm');
    if (addSchoolForm) {
        addSchoolForm.addEventListener('submit', handleAddSchool);
    }

    // Admin Events
    const openAddTeacherModalBtn = document.getElementById('openAddTeacherModalBtn');
    if (openAddTeacherModalBtn) {
        openAddTeacherModalBtn.addEventListener('click', () => openModal('addTeacherModal'));
    }

    const addTeacherForm = document.getElementById('addTeacherForm');
    if (addTeacherForm) {
        addTeacherForm.addEventListener('submit', handleAddTeacher);
    }

    // Grid Settings
    const gridSettingsBtn = document.getElementById('gridSettingsBtn');
    const gridSizeRange = document.getElementById('gridSize');
    const gridSizeValue = document.getElementById('gridSizeValue');

    if (gridSettingsBtn) {
        gridSettingsBtn.addEventListener('click', () => {
            // Get current subject
            const subjectDropdown = document.getElementById('subjectDropdown');
            const subjectId = subjectDropdown ? subjectDropdown.dataset.value : null;

            const settings = Storage.getGridSettings(subjectId);
            document.getElementById('gridRows').value = settings.rows;
            document.getElementById('gridCols').value = settings.cols;
            gridSizeRange.value = settings.size;
            gridSizeValue.textContent = settings.size + '%';
            openModal('gridSettingsModal');
        });
    }

    if (gridSizeRange) {
        const updateRangeBackground = (val) => {
            const min = gridSizeRange.min || 50;
            const max = gridSizeRange.max || 200;
            const percentage = ((val - min) / (max - min)) * 100;
            gridSizeRange.style.background = `linear-gradient(to right, var(--primary-color) 0%, var(--primary-color) ${percentage}%, #eef2f7 ${percentage}%, #eef2f7 100%)`;
        };

        gridSizeRange.addEventListener('input', (e) => {
            gridSizeValue.textContent = e.target.value + '%';
            updateRangeBackground(e.target.value);
        });

        // Initial update
        const settings = Storage.getGridSettings();
        updateRangeBackground(settings.size);
    }

    // Grades Page Events
    const addGradeColBtn = document.getElementById('addGradeColumnBtn');
    if (addGradeColBtn) {
        addGradeColBtn.addEventListener('click', () => Grades.addColumn());
    }

    const showGradesChartBtn = document.getElementById('showGradesChartBtn');
    if (showGradesChartBtn) {
        showGradesChartBtn.addEventListener('click', () => Grades.toggleChart());
    }

    const saveGradesBtn = document.getElementById('saveGradesBtn');
    if (saveGradesBtn) {
        saveGradesBtn.addEventListener('click', () => Grades.saveAll());
    }

    // Simplified original single button removed from HTML
    // const exportGradesExcelBtn = document.getElementById('exportGradesExcelBtn');
    // if (exportGradesExcelBtn) {
    //     exportGradesExcelBtn.addEventListener('click', () => Grades.exportExcel());
    // }



    const gridSettingsForm = document.getElementById('gridSettingsForm');
    if (gridSettingsForm) {
        gridSettingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const settings = {
                rows: parseInt(document.getElementById('gridRows').value),
                cols: parseInt(document.getElementById('gridCols').value),
                size: parseInt(gridSizeRange.value)
            };

            // Save for current subject
            const subjectDropdown = document.getElementById('subjectDropdown');
            const subjectId = subjectDropdown ? subjectDropdown.dataset.value : null;

            Storage.saveGridSettings(settings, subjectId);
            closeModal(document.getElementById('gridSettingsModal'));
            Classroom.loadClassroom(); // Refresh grid
            showToast('Đã cập nhật cấu hình sơ đồ' + (subjectId ? ' cho môn học này' : ''));
        });
    }

    const deleteAllBtn = document.getElementById('deleteAllStudentsBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            if (confirm('Bạn có chắc chắn muốn xóa TẤT CẢ học sinh trong lớp này không? Hành động này không thể hoàn tác.')) {
                const currentClassId = document.getElementById('classDropdown').dataset.value || 'class1';
                const students = Storage.getStudents();
                const remainingStudents = students.filter(s => s.classId !== currentClassId);
                Storage.saveStudents(remainingStudents);

                closeModal(document.getElementById('gridSettingsModal'));
                Classroom.loadClassroom();
                if (document.getElementById('studentsPage').classList.contains('active')) {
                    loadStudentsList();
                }
                showToast('Đã xóa tất cả học sinh trong lớp');
            }
        });
    }

    // System Settings (Backup/Restore)
    const appSettingsBtn = document.getElementById('appSettingsBtn');
    if (appSettingsBtn) {
        appSettingsBtn.addEventListener('click', () => openModal('appSettingsModal'));
    }

    // Password Management Listeners
    const changePassBtn = document.getElementById('changePassBtn');
    if (changePassBtn) {
        changePassBtn.addEventListener('click', () => {
            document.getElementById('changePasswordForm').reset();
            openModal('changePasswordModal');
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handleUpdatePassword);
    }

    const resetPasswordForm = document.getElementById('resetPasswordForm');
    if (resetPasswordForm) {
        resetPasswordForm.addEventListener('submit', handleResetPassword);
    }

    // Admin Group Events
    const selectAllTeachers = document.getElementById('selectAllTeachers');
    if (selectAllTeachers) {
        selectAllTeachers.addEventListener('change', (e) => {
            const checkboxes = document.querySelectorAll('.teacher-select');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        });
    }

    const createGroupBtn = document.getElementById('createGroupBtn');
    if (createGroupBtn) {
        createGroupBtn.addEventListener('click', handleCreateGroup);
    }

    const exportDataBtn = document.getElementById('exportDataBtn');
    if (exportDataBtn) {
        exportDataBtn.addEventListener('click', () => {
            const dataStr = Storage.exportData();
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `Backup_QuanLyHocSinh_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            showToast('Đã xuất dữ liệu thành công');
        });
    }

    const exportCurrentClassBtn = document.getElementById('exportCurrentClassBtn');
    if (exportCurrentClassBtn) {
        exportCurrentClassBtn.addEventListener('click', () => {
            const currentClassId = document.getElementById('classDropdown').dataset.value;
            const currentSchoolId = document.getElementById('schoolDropdown').dataset.value;
            const currentClassName = document.getElementById('currentClassName').textContent;

            if (!currentClassId) {
                alert('Vui lòng chọn lớp học trước khi xuất!');
                return;
            }

            const dataStr = Storage.exportClassData(currentClassId, currentSchoolId);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

            const exportFileDefaultName = `Lop_${currentClassName.replace(/\s/g, '_')}_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.json`;

            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            showToast(`Đã xuất dữ liệu lớp ${currentClassName} thành công`);
        });
    }

    const importDataBtn = document.getElementById('importDataBtn');
    const importDataInput = document.getElementById('importDataInput');
    if (importDataBtn && importDataInput) {
        importDataBtn.addEventListener('click', () => importDataInput.click());
        importDataInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function (event) {
                const success = Storage.importData(event.target.result);
                if (success) {
                    showToast('Nhập dữ liệu thành công! Đang tải lại...');
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    alert('Lỗi: File dữ liệu không hợp lệ!');
                }
            };
            reader.readAsText(file);
            e.target.value = ''; // Reset
        });
    }

    // Sharing Feature Logic
    const shareStatusToggle = document.getElementById('shareStatusToggle');
    const sharingOptions = document.getElementById('sharingOptions');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyShareLinkBtn = document.getElementById('copyShareLinkBtn');
    const sendEmailNoticeBtn = document.getElementById('sendEmailNoticeBtn');

    // Load initial sharing state
    const currentSharing = Storage.getSharingSettings();
    if (shareStatusToggle) {
        shareStatusToggle.checked = currentSharing.isEnabled;
        sharingOptions.style.display = currentSharing.isEnabled ? 'block' : 'none';

        shareStatusToggle.addEventListener('change', (e) => {
            const isEnabled = e.target.checked;
            currentSharing.isEnabled = isEnabled;
            Storage.saveSharingSettings(currentSharing);
            sharingOptions.style.display = isEnabled ? 'block' : 'none';

            if (isEnabled) {
                updateShareLink();
                showToast('Đã bật chế độ chia sẻ');
            } else {
                showToast('Đã tắt chia sẻ toàn bộ');
            }
        });
    }

    function updateShareLink() {
        if (!shareLinkInput) return;
        const currentClassId = document.getElementById('classDropdown').dataset.value;
        if (currentClassId) {
            // Simulated share link using URL parameter
            const baseUrl = window.location.origin + window.location.pathname;
            const shareCode = btoa(currentClassId).slice(0, 12); // Sample obfuscation
            shareLinkInput.value = `${baseUrl}?share=${shareCode}`;
        } else {
            shareLinkInput.value = 'Chưa chọn lớp';
        }
    }

    if (copyShareLinkBtn) {
        copyShareLinkBtn.addEventListener('click', () => {
            shareLinkInput.select();
            document.execCommand('copy');
            showToast('Đã sao chép link chia sẻ');
        });
    }

    if (sendEmailNoticeBtn) {
        sendEmailNoticeBtn.addEventListener('click', () => {
            const email = document.getElementById('shareEmailInput').value;
            const currentClassName = document.getElementById('currentClassName').textContent;
            if (!email) {
                alert('Vui lòng nhập email người nhận');
                return;
            }

            const subject = encodeURIComponent(`Chia sẻ dữ liệu lớp học: ${currentClassName}`);
            const body = encodeURIComponent(`Chào bạn,\n\nTôi muốn chia sẻ dữ liệu quản lý lớp ${currentClassName} với bạn.\nBạn có thể truy cập qua link:\n${shareLinkInput.value}\n\nTrân trọng.`);

            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
            showToast('Đã mở ứng dụng mail để gửi thông báo');
        });
    }

    // Search student
    document.getElementById('searchStudent').addEventListener('input', function () {
        searchStudents(this.value);
    });

    // File Import Events
    const importFileBtn = document.getElementById('importFileBtn');
    const localFileImport = document.getElementById('localFileImport');
    const importDriveBtn = document.getElementById('importDriveBtn');

    if (importFileBtn) {
        importFileBtn.addEventListener('click', () => localFileImport.click());
    }

    if (localFileImport) {
        localFileImport.addEventListener('change', handleLocalFileImport);
    }

    if (importDriveBtn) {
        importDriveBtn.addEventListener('click', handleDriveImport);
    }

    // Class selection (OLD removed)
    // Initialize with sample data if empty
    initializeSampleData();

    // Load initial data
    loadInitialData();
});

function initApp() {
    console.log('Student Management App initialized');
}

function showLoginPage() {
    document.getElementById('loginPage').classList.add('active');
    document.getElementById('classroomPage').classList.remove('active');
    document.getElementById('studentsPage').classList.remove('active');
    document.getElementById('gradesPage').classList.remove('active');
    document.getElementById('reportsPage').classList.remove('active');
    const adminPage = document.getElementById('adminPage');
    if (adminPage) adminPage.classList.remove('active');

    // Hide Main Nav on Login
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) mainNav.style.display = 'none';

    // Hide Header Icons on Login
    ['notificationBtn', 'appSettingsBtn', 'logoutBtn', 'changePassBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = 'none';
    });

    // Reset navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function showAppContent() {
    const teacher = Storage.getTeacher();

    // Safety check: is the current user locked?
    if (teacher) {
        const authorizedTeachers = Storage.getAuthorizedTeachers();
        const currentAuth = authorizedTeachers.find(t => t.email.toLowerCase() === teacher.email.toLowerCase());
        if (currentAuth && currentAuth.isLocked) {
            alert('Tài khoản của bạn đã bị khóa bởi quản trị viên.');
            Storage.removeTeacher();
            showLoginPage();
            return;
        }
    }

    document.getElementById('loginPage').classList.remove('active');
    document.body.style.overflow = ''; // Ensure scrollbar is active

    // Refresh application data (dropdowns, state) for the current user
    refreshAppData();

    // Show Main Nav
    const mainNav = document.querySelector('.main-nav');
    if (mainNav) mainNav.style.display = 'block';

    // Show Header Icons
    ['notificationBtn', 'appSettingsBtn', 'logoutBtn', 'changePassBtn'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.style.display = '';
    });

    // Get all nav buttons
    const navButtons = document.querySelectorAll('.nav-btn:not(#navAdminBtn)');
    const adminTab = document.getElementById('navAdminBtn');

    if (teacher && teacher.role === 'admin') {
        // Hide standard teacher tabs
        navButtons.forEach(btn => btn.style.display = 'none');
        // Show admin tab
        if (adminTab) adminTab.style.display = 'flex';
        // Switch to admin page
        switchPage('admin');
    } else {
        // Show standard teacher tabs
        navButtons.forEach(btn => btn.style.display = 'flex');
        // Hide admin tab
        if (adminTab) adminTab.style.display = 'none';
        if (adminTab) adminTab.style.display = 'none';
        // Switch to default classroom page
        switchPage('classroom');
    }
}

async function handleLogin() {
    const email = document.getElementById('teacherEmail').value.trim();
    const password = document.getElementById('teacherPassword').value;

    if (!email || !password) {
        alert('Vui lòng nhập email và mật khẩu');
        return;
    }

    // Show loading state
    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.textContent;
    loginBtn.disabled = true;
    loginBtn.textContent = 'Đang đăng nhập...';

    try {
        // 1. Try Firebase Authentication
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        // Authentication is handled by onAuthStateChanged listener
    } catch (error) {
        // 2. If Firebase fails (e.g., user doesn't exist yet but is in local Auth list)
        // Check our local "Authorized" list
        const authorizedTeachers = Storage.getAuthorizedTeachers();
        const teacherAuth = authorizedTeachers.find(t => t.email.toLowerCase() === email.toLowerCase());

        if (teacherAuth && password === teacherAuth.password) {
            try {
                // Create Firebase account on the fly for existing local users
                await auth.createUserWithEmailAndPassword(email, password);
                showToast("Đã thiết lập tài khoản mây cho bạn!");
            } catch (createError) {
                console.error("Firebase Sync Error:", createError);
                // If creation fails but password matches, still alert something
                alert('Lỗi đồng bộ mây: ' + error.message);
            }
        } else {
            alert('Email hoặc mật khẩu không đúng!');
            loginBtn.disabled = false;
            loginBtn.textContent = originalText;
        }
    }
}

function handleLogout() {
    auth.signOut().then(() => {
        Storage.removeTeacher();
        location.reload(); // Hard reload to clear state
    });
}

function handleUpdatePassword(e) {
    if (e) e.preventDefault();
    const currentTeacher = Storage.getTeacher();
    if (!currentTeacher) return;

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        alert('Mật khẩu xác nhận không khớp!');
        return;
    }

    const teachers = Storage.getAuthorizedTeachers();
    const teacherAuth = teachers.find(t => t.email.toLowerCase() === currentTeacher.email.toLowerCase());

    if (teacherAuth && oldPassword === teacherAuth.password) {
        Storage.updateTeacherPassword(currentTeacher.email, newPassword);
        closeModal(document.getElementById('changePasswordModal'));
        showToast('Đã đổi mật khẩu thành công!');
    } else {
        alert('Mật khẩu hiện tại không chính xác!');
    }
}

// Admin Page Functions
function loadAdminPage(searchTerm = '') {
    const tbody = document.getElementById('teacherTableBody');
    if (!tbody) return;

    // Admin Controls UI (Search + Import)
    const adminControls = document.getElementById('adminControls');
    if (adminControls && adminControls.innerHTML.trim() === '') {
        adminControls.innerHTML = `
            <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap; margin-bottom: 1rem;">
                <div class="search-box">
                    <i class="fas fa-search"></i>
                    <input type="text" id="teacherSearchInput" placeholder="Tìm kiếm giáo viên (email, tên)..." onkeyup="loadAdminPage(this.value)">
                </div>
                <div style="display: flex; gap: 0.5rem;">
                     <!-- File Import -->
                    <label for="importTeacherFile" class="btn-secondary" style="cursor: pointer;">
                        <i class="fas fa-file-excel"></i> Nhập Excel
                    </label>
                    <input type="file" id="importTeacherFile" accept=".xlsx, .xls" style="display: none;" onchange="handleTeacherImportFile(event)">
                    
                    <!-- Google Sheet Import -->
                    <div style="display: flex; gap: 0.5rem;">
                        <input type="text" id="teacherSheetLink" placeholder="Link Google Sheets..." class="select-input" style="width: 200px;">
                        <button class="btn-secondary" onclick="handleTeacherImportDrive()">
                            <i class="fab fa-google-drive"></i> Nhập G.Sheet
                        </button>
                    </div>
                    
                    <button class="btn-primary" onclick="openModal('addTeacherModal')">
                        <i class="fas fa-user-plus"></i> Thêm cấp quyền
                    </button>
                </div>
            </div>
            <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; font-style: italic;">
                * Cấu trúc file nhập: Dữ liệu bắt đầu từ dòng 7. Cột B: Email, Cột C: Họ và tên.
            </div>
        `;
    }

    const teachers = Storage.getAuthorizedTeachers();
    tbody.innerHTML = '';

    // Filter
    const filtered = teachers.filter(t =>
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    filtered.forEach((t, index) => {
        const tr = document.createElement('tr');
        const isLocked = t.isLocked;
        const isAdmin = t.role === 'admin';

        tr.innerHTML = `
            <td><input type="checkbox" class="teacher-select" value="${t.email}"></td>
            <td class="stt-col">${index + 1}</td>
            <td>${t.email}</td>
            <td>${t.name}</td>
            <td><span class="role-badge ${t.role}">${t.role === 'admin' ? 'Quản trị' : 'Giáo viên'}</span></td>
            <td>
                <label class="switch">
                    <input type="checkbox" ${!isLocked ? 'checked' : ''} onchange="handleToggleTeacherLock('${t.email}')" ${isAdmin ? 'disabled' : ''}>
                    <span class="slider round"></span>
                </label>
            </td>
            <td>
                <div class="action-buttons" style="display: flex; gap: 8px;">
                    <button class="btn-icon" onclick="openResetPasswordModal('${t.email}')" title="Reset/Đổi mật khẩu" 
                        style="background: #fff8e1; color: #f39c12; border: 1px solid #ffe082; width: 32px; height: 32px; border-radius: 6px;">
                        <i class="fas fa-key"></i>
                    </button>
                    <button class="btn-icon" onclick="handleDeleteTeacher('${t.email}')" title="Xóa" ${isAdmin ? 'disabled' : ''}
                        style="background: #fff1f0; color: #f5222d; border: 1px solid #ffa39e; width: 32px; height: 32px; border-radius: 6px; ${isAdmin ? 'opacity: 0.3; cursor: not-allowed;' : ''}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    renderTeacherGroups();
}

function renderTeacherGroups() {
    const list = document.getElementById('teacherGroupsList');
    if (!list) return;
    const groups = Storage.getGroups();

    if (groups.length === 0) {
        list.innerHTML = '<p style="font-size: 0.85rem; color: #999; font-style: italic;">Chưa có nhóm nào</p>';
        return;
    }

    list.innerHTML = '';
    groups.forEach(group => {
        const groupEl = document.createElement('div');
        groupEl.className = 'group-item';
        groupEl.style = 'padding: 10px; border: 1px solid #eee; border-radius: 8px; cursor: pointer; transition: all 0.2s;';
        groupEl.onmouseover = () => groupEl.style.background = '#f0f7ff';
        groupEl.onmouseout = () => groupEl.style.background = 'transparent';
        groupEl.onclick = () => openViewGroupModal(group.id);

        groupEl.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 600; color: #333;">${group.name}</span>
                <span style="font-size: 0.75rem; background: #eef2f7; padding: 2px 6px; border-radius: 4px; color: #666;">
                    ${group.members.length} TV
                </span>
            </div>
        `;
        list.appendChild(groupEl);
    });
}

function handleCreateGroup() {
    const selected = Array.from(document.querySelectorAll('.teacher-select:checked')).map(cb => cb.value);
    if (selected.length === 0) {
        alert('Vui lòng chọn ít nhất một giáo viên để tạo nhóm');
        return;
    }

    const groupName = prompt('Nhập tên nhóm mới:');
    if (groupName && groupName.trim()) {
        Storage.addGroup(groupName.trim(), selected);
        showToast('Đã tạo nhóm thành công');
        loadAdminPage();

        // Uncheck all
        document.getElementById('selectAllTeachers').checked = false;
    }
}

function openViewGroupModal(groupId) {
    const groups = Storage.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    document.getElementById('viewGroupName').textContent = group.name;
    const list = document.getElementById('groupMembersList');
    list.innerHTML = '';

    const teachers = Storage.getAuthorizedTeachers();
    group.members.forEach(email => {
        const teacher = teachers.find(t => t.email === email);
        const memberEl = document.createElement('div');
        memberEl.style = 'display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px;';
        memberEl.innerHTML = `
            <div>
                <div style="font-weight: 500;">${teacher ? teacher.name : 'Không xác định'}</div>
                <div style="font-size: 0.8rem; color: #666;">${email}</div>
            </div>
        `;
        list.appendChild(memberEl);
    });

    document.getElementById('deleteGroupBtn').onclick = () => {
        if (confirm(`Bạn có chắc muốn xóa nhóm "${group.name}" không?`)) {
            Storage.deleteGroup(groupId);
            closeModal(document.getElementById('viewGroupMembersModal'));
            showToast('Đã xóa nhóm thành công');
            loadAdminPage();
        }
    };

    openModal('viewGroupMembersModal');
}

function openResetPasswordModal(email) {
    const teachers = Storage.getAuthorizedTeachers();
    const teacher = teachers.find(t => t.email === email);
    if (!teacher) return;

    document.getElementById('resetTeacherEmail').textContent = email;
    document.getElementById('resetTeacherName').textContent = teacher.name;
    document.getElementById('newResetPassword').value = '';
    openModal('resetPasswordModal');
}

function handleResetPassword(e) {
    if (e) e.preventDefault();
    const email = document.getElementById('resetTeacherEmail').textContent;
    const newPassword = document.getElementById('newResetPassword').value.trim();

    if (confirm(`Bạn có chắc muốn ${newPassword ? 'đặt mật khẩu mới' : 'reset mật khẩu về mặc định (123456)'} cho giáo viên này?`)) {
        Storage.resetTeacherPassword(email, newPassword || '123456');
        closeModal(document.getElementById('resetPasswordModal'));
        showToast(`Đã ${newPassword ? 'đặt mật khẩu mới' : 'reset mật khẩu'} thành công!`);
    }
}

function handleTeacherImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        processTeacherImport(workbook);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
}

function handleTeacherImportDrive() {
    const link = document.getElementById('teacherSheetLink').value;
    if (!link) {
        showToast('Vui lòng nhập link Google Sheets');
        return;
    }
    const match = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        showToast('Link không hợp lệ');
        return;
    }
    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

    showToast('Đang tải dữ liệu...');
    fetch(exportUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            processTeacherImport(workbook);
        })
        .catch(err => {
            console.error(err);
            showToast('Lỗi tải file. Kiểm tra lại quyền truy cập (Công khai).');
        });
}

function processTeacherImport(workbook) {
    const sheetIdx = 0; // First sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[sheetIdx]];

    // Start from Row 7 (index 6). 
    // Col B -> Index 1 (Email), Col C -> Index 2 (Name)
    const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 6 });

    let count = 0;
    json.forEach(row => {
        const email = row[1]; // Col B
        const name = row[2];  // Col C

        if (email && String(email).includes('@')) {
            // Trim and clean
            const cleanEmail = String(email).trim();
            const cleanName = name ? String(name).trim() : 'Giáo viên mới';

            if (Storage.addAuthorizedTeacher(cleanEmail, cleanName)) {
                count++;
            }
        }
    });

    if (count > 0) {
        showToast(`Đã thêm thành công ${count} giáo viên.`);
        loadAdminPage();
    } else {
        showToast('Không tìm thấy dữ liệu mới hoặc bị trùng lặp.', 'error');
    }
}

function handleAddTeacher(e) {
    e.preventDefault();
    const email = document.getElementById('newTeacherEmail').value.trim();
    const name = document.getElementById('newTeacherNameAdmin').value.trim();

    if (Storage.addAuthorizedTeacher(email, name)) {
        showToast('Đã cấp quyền cho giáo viên thành công');
        closeModal(document.getElementById('addTeacherModal'));
        loadAdminPage();
        e.target.reset();
    } else {
        alert('Email này đã tồn tại trong danh sách!');
    }
}

function handleDeleteTeacher(email) {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${email}? \nHành động này không thể hoàn tác.`)) {
        if (Storage.deleteAuthorizedTeacher(email)) {
            showToast('Đã xóa tài khoản thành công');
            loadAdminPage();
        } else {
            alert('Không thể xóa tài khoản này.');
        }
    }
}

function handleToggleTeacherLock(email) {
    if (Storage.toggleTeacherLock(email)) {
        showToast('Đã cập nhật trạng thái tài khoản');
        loadAdminPage();
    }
}

function handleLogout() {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
        Storage.removeTeacher();
        updateTeacherName('Giáo viên');
        showLoginPage();

        // Clear login form
        document.getElementById('teacherEmail').value = '';
        document.getElementById('teacherPassword').value = '';
    }
}

function updateTeacherName(name) {
    document.getElementById('teacherName').textContent = name;
}

function switchPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });

    // Show selected page
    const pageElement = document.getElementById(pageId + 'Page');
    if (pageElement) {
        pageElement.classList.add('active');
    }

    // Update navigation buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageId) {
            btn.classList.add('active');
        }
    });

    // Load page-specific content
    switch (pageId) {
        case 'classroom':
            Classroom.loadClassroom();
            break;
        case 'students':
            loadStudentsList();
            break;
        case 'grades':
            loadGradesPage();
            break;
        case 'reports':
            loadReportsPage();
            break;
        case 'admin':
            loadAdminPage();
            break;
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
}

function closeModal(modalId) {
    const modal = typeof modalId === 'string' ? document.getElementById(modalId) : modalId;
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

function handleAddStudent(e) {
    e.preventDefault();

    const name = document.getElementById('newStudentName').value;
    const dob = document.getElementById('newStudentDob').value;
    const gender = document.getElementById('newStudentGender').value;

    const notes = document.getElementById('newStudentNotes').value;
    const conduct = document.getElementById('newStudentConduct').value || 8;
    const editId = document.getElementById('editStudentId').value;

    // Get avatar from preview dataset
    const avatarPreview = document.getElementById('avatarPreview');
    let avatar = 'default';
    if (avatarPreview.dataset.base64) {
        avatar = avatarPreview.dataset.base64;
    }

    if (!name) {
        // fail silently or show toast? User said remove alerts like "127... says". 
        // Standard browser validation handles 'required' on form submit usually, but this is JS check.
        // We will just return.
        return;
    }

    const students = Storage.getStudents();

    if (editId) {
        // Edit mode
        const studentIndex = students.findIndex(s => s.id === editId);
        if (studentIndex !== -1) {
            students[studentIndex].name = name;
            students[studentIndex].dob = dob ? new Date(dob).toLocaleDateString('vi-VN') : 'chưa cập nhật';
            students[studentIndex].gender = gender;
            students[studentIndex].notes = notes;
            students[studentIndex].conduct = conduct;
            if (avatarPreview.dataset.base64) {
                students[studentIndex].avatar = avatarPreview.dataset.base64;
            }

            Storage.saveStudents(students);

            // Close and Reset
            const modal = document.getElementById('addStudentModal');
            closeModal(modal);
            e.target.reset();
            document.getElementById('editStudentId').value = '';
            delete document.getElementById('avatarPreview').dataset.base64;

            // Refresh
            if (document.getElementById('classroomPage').classList.contains('active')) {
                Classroom.loadClassroom();
            } else if (document.getElementById('studentsPage').classList.contains('active')) {
                loadStudentsList();
            }
        }
    } else {
        // Add mode
        const currentClassId = document.getElementById('classDropdown').dataset.value;
        const schoolId = document.getElementById('schoolDropdown').dataset.value;

        if (!currentClassId) {
            alert('Vui lòng chọn lớp học trước khi thêm học sinh!');
            return;
        }

        const newId = 'HS' + String(students.length + 1).padStart(3, '0') + Date.now().toString().slice(-4);

        // Use target seat from modal if it exists
        const modal = document.getElementById('addStudentModal');
        let assignedSeat = modal.dataset.targetSeat;

        // If no target seat, find first empty
        if (assignedSeat === undefined || assignedSeat === null || assignedSeat === '') {
            const gridSettings = Storage.getGridSettings();
            const totalSeats = gridSettings.rows * gridSettings.cols;
            const classStudents = students.filter(s => s.classId === currentClassId);
            const occupiedSeats = classStudents.map(s => parseInt(s.seat));

            for (let i = 0; i < totalSeats; i++) {
                if (!occupiedSeats.includes(i)) {
                    assignedSeat = i;
                    break;
                }
            }
        }

        const newStudent = {
            id: newId,
            name: name,
            dob: dob ? new Date(dob).toLocaleDateString('vi-VN') : 'Chưa cập nhật',
            gender: gender,
            seat: assignedSeat,
            avatar: avatar,
            classId: currentClassId,
            subjects: Storage.getSubjects(schoolId).map(s => ({ name: s.name, score: null })),
            notes: notes,
            conduct: conduct,
            comments: '',
            averageScore: 0
        };

        students.push(newStudent);
        Storage.saveStudents(students);

        closeModal(modal);
        e.target.reset();
        delete document.getElementById('avatarPreview').dataset.base64;
        delete modal.dataset.targetSeat;

        if (document.getElementById('classroomPage').classList.contains('active')) {
            Classroom.loadClassroom();
        } else if (document.getElementById('studentsPage').classList.contains('active')) {
            loadStudentsList();
        }
    }
}


// Using the "WithoutConfirm" version logic but named deleteStudent
function deleteStudent(studentId) {
    const students = Storage.getStudents();
    const newStudents = students.filter(s => s.id !== studentId);
    Storage.saveStudents(newStudents);

    if (document.getElementById('classroomPage').classList.contains('active')) {
        Classroom.loadClassroom();
    } else if (document.getElementById('studentsPage').classList.contains('active')) {
        loadStudentsList();
    }
}


function editStudent(studentId) {
    const students = Storage.getStudents();
    const student = students.find(s => s.id === studentId);

    if (!student) return;

    // Populate form
    document.getElementById('newStudentName').value = student.name;
    // DOB handling might need parsing if format is DD/MM/YYYY
    // student.dob is strings like '15/05/2007'. Input type=date needs YYYY-MM-DD.
    if (student.dob && student.dob.includes('/')) {
        const parts = student.dob.split('/');
        if (parts.length === 3) {
            document.getElementById('newStudentDob').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    }

    document.getElementById('newStudentGender').value = student.gender;

    document.getElementById('newStudentNotes').value = student.notes || '';
    document.getElementById('newStudentConduct').value = student.conduct || 8;
    document.getElementById('editStudentId').value = student.id;

    // Avatar
    const avatarPreview = document.getElementById('avatarPreview');
    if (student.avatar && student.avatar.startsWith('data:image')) {
        avatarPreview.innerHTML = `<img src="${student.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
        avatarPreview.dataset.base64 = student.avatar;
    } else {
        avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
        delete avatarPreview.dataset.base64;
    }

    // Change UI
    document.querySelector('#addStudentModal h3').textContent = 'Chỉnh sửa thông tin học sinh';
    document.getElementById('saveStudentBtn').textContent = 'Lưu thông tin';

    // Open
    closeModal(document.getElementById('studentModal')); // Close detail if open
    openModal('addStudentModal');
}
// Enhanced Load Students List
function loadStudentsList() {
    const students = Storage.getStudents();
    const classDropdown = document.getElementById('classDropdown');
    const currentClassId = classDropdown ? classDropdown.dataset.value : '';
    const subjectDropdown = document.getElementById('subjectDropdown');
    const currentSubjectId = subjectDropdown ? subjectDropdown.dataset.value : '';

    // Filter students by class
    const filteredStudents = students.filter(s => s.classId === currentClassId);

    // Get Attendance Sessions for this Class + Subject
    // IMPORTANT: If no class is selected (currentClassId is empty), we should NOT get any sessions
    // This fixes the issue of attendance columns appearing in "Chưa có lớp" state
    let sessions = [];
    if (currentClassId) {
        sessions = Storage.getAttendanceSessions(currentClassId, currentSubjectId);
    }

    // Init Session Stats Counter
    const sessionStats = {};
    sessions.forEach(s => {
        sessionStats[s.id] = { present: 0, excused: 0, unexcused: 0, off: 0 };
    });

    // Rebuild HEADER
    const theadRow = document.getElementById('studentsTableHeadRow');
    if (theadRow) {
        let headerHTML = `
            <th class="sticky-left" style="width: 50px; min-width: 50px; left: 0;">STT</th>
            <th class="sticky-left" style="width: 250px; min-width: 250px; left: 50px;">Họ và tên</th>
            <th class="sticky-left" style="width: 120px; min-width: 120px; left: 300px;">Ngày sinh</th>
            <th class="sticky-left" style="width: 100px; min-width: 100px; left: 420px;">Giới tính</th>
        `;

        // Add Attendance Columns
        sessions.forEach(session => {
            headerHTML += `
                <th style="min-width: 130px; padding: 5px; text-align: center;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
                        <input type="date" value="${session.date}" 
                            onchange="updateAttendanceDate('${session.id}', this.value)"
                            style="border: 1px solid #ddd; border-radius: 4px; padding: 4px; font-size: 0.85rem; width: 115px;">
                        <button class="btn-icon-small" title="Xóa cột điểm danh"
                                onclick="deleteAttendanceSession('${session.id}')"
                                style="width: 24px; height: 24px; font-size: 0.8rem; color: #dc3545; background: #fff; border: 1px solid #eee;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </th>
            `;
        });

        // New Stats Column (Sticky Right)
        headerHTML += `<th class="sticky-presence" style="width: 80px; min-width: 80px; right: 80px; text-align: center;">Chuyên cần</th>`;

        // Action Column 
        headerHTML += `<th class="sticky-action" style="width: 80px; min-width: 80px; right: 0;">Thao tác</th>`;
        theadRow.innerHTML = headerHTML;
    }

    const tbody = document.getElementById('studentsTableBody');
    tbody.innerHTML = '';

    // If no students
    if (filteredStudents.length === 0) {
        const colSpan = 6 + sessions.length;
        tbody.innerHTML = `
            <tr>
                <td colspan="${colSpan}" style="text-align: center; padding: 2rem;">
                    <i class="fas fa-users-slash" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p>Chưa có học sinh nào trong lớp này.</p>
                    <button class="btn-primary" onclick="openModal('addStudentModal')">
                        <i class="fas fa-user-plus"></i> Thêm học sinh đầu tiên
                    </button>
                </td>
            </tr>
        `;
        // Clear footer if exists
        const oldTfoot = document.getElementById('studentsTableFoot');
        if (oldTfoot) oldTfoot.remove();
        return;
    }

    // Render Rows
    filteredStudents.forEach((student, index) => {
        const row = document.createElement('tr');

        // Base info
        let rowHTML = `
            <td class="sticky-left" style="width: 50px; min-width: 50px; left: 0;">${index + 1}</td>
            <td class="sticky-left" style="width: 250px; min-width: 250px; left: 50px;">
                <div style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 230px;">${student.name}</div>
            </td>
            <td class="sticky-left" style="width: 120px; min-width: 120px; left: 300px;">${student.dob}</td>
            <td class="sticky-left" style="width: 100px; min-width: 100px; left: 420px;">${student.gender}</td>
        `;

        // Attendance Cells
        sessions.forEach(session => {
            // Default to 'present' if not set
            const status = (student.attendance && student.attendance[session.id]) || 'present';

            // Accumulate Stats
            if (sessionStats[session.id][status] !== undefined) {
                sessionStats[session.id][status]++;
            } else if (status === 'none') {
                // treat none as present if we want default, but logic above sets it to present
                sessionStats[session.id]['present']++;
            }

            // Define colors
            let bg = '#fff';
            let color = '#333';
            if (status === 'present') { bg = '#dcfce7'; color = '#166534'; } // Green
            else if (status === 'excused') { bg = '#fef3c7'; color = '#9a3412'; } // Orange
            else if (status === 'unexcused') { bg = '#fee2e2'; color = '#991b1b'; } // Red
            else if (status === 'off') { bg = '#f3f4f6'; color = '#4b5563'; } // Gray

            rowHTML += `
                <td style="text-align: center; padding: 4px;">
                    <select onchange="updateAttendanceStatus('${student.id}', '${session.id}', this.value)"
                            style="border: 1px solid #e5e7eb; border-radius: 6px; padding: 4px 2px; font-size: 0.85rem; width: 100px; 
                                   background-color: ${bg}; color: ${color}; font-weight: 500; cursor: pointer; outline: none;">
                        <option value="present" ${status === 'present' ? 'selected' : ''}>Có</option>
                        <option value="excused" ${status === 'excused' ? 'selected' : ''}>C.Phép</option>
                        <option value="unexcused" ${status === 'unexcused' ? 'selected' : ''}>K.Phép</option>
                        <option value="off" ${status === 'off' ? 'selected' : ''}>Nghỉ</option>
                    </select>
                </td>
            `;
        });

        // Calculate Student Attendance Stat (Presence/Total)
        let presentCount = 0;
        const totalSessions = sessions.length;
        sessions.forEach(session => {
            const status = (student.attendance && student.attendance[session.id]) || 'present';
            if (status === 'present') presentCount++;
        });

        rowHTML += `
            <td class="sticky-presence" style="text-align: center; font-weight: 700; color: var(--primary-color); right: 80px;">
                ${presentCount}/${totalSessions}
            </td>
        `;

        // Action Cell
        rowHTML += `
            <td class="sticky-action" style="text-align: center; right: 0;">
                <div style="display: flex; justify-content: center; gap: 5px;">
                    <button class="btn-icon-small" onclick="viewStudentDetails('${student.id}')" title="Chi tiết" style="width: 28px; height: 28px;">
                        <i class="fas fa-info-circle"></i>
                    </button>
                    <button class="btn-icon-small" onclick="deleteStudentWrapper('${student.id}')" title="Xóa học sinh" 
                            style="width: 28px; height: 28px; color: var(--danger-color);">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </td>
        `;

        row.innerHTML = rowHTML;
        tbody.appendChild(row);
    });

    // Handle Footer for statistics
    const table = document.querySelector('.students-table');
    let tfoot = document.getElementById('studentsTableFoot');
    if (!tfoot) {
        tfoot = document.createElement('tfoot');
        tfoot.id = 'studentsTableFoot';
        table.appendChild(tfoot);
    }

    let footerHTML = `
        <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0; position: sticky; bottom: 0; z-index: 150;">
            <td class="sticky-footer-label" colspan="4" style="text-align: right; padding: 10px; font-weight: bold; color: #64748b; vertical-align: top;">
                Thống kê chi tiết:
            </td>
    `;

    sessions.forEach(session => {
        const stats = sessionStats[session.id];
        const totalClass = filteredStudents.length;
        const totalAbsent = stats.excused + stats.unexcused + stats.off;

        footerHTML += `
            <td style="padding: 4px; font-size: 0.8rem; line-height: 1.5; vertical-align: top; background-color: #f1f5f9; border-left: 1px solid #e2e8f0; position: sticky; bottom: 0; z-index: 150;">
                <div style="width: 110px; margin: 0 auto;">
                    <div style="font-weight: bold; margin-bottom: 4px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-align: center; white-space: nowrap;">
                        Sĩ số: <span style="color: #166534;">${stats.present}</span>/<span style="color: #0f172a;">${totalClass}</span> <span style="color: #dc2626; font-size: 0.75rem;">(${totalAbsent})</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding: 0 2px;"><span>Có:</span> <b>${stats.present}</b></div>
                    <div style="display:flex; justify-content:space-between; padding: 0 2px; color: #d97706;"><span>C.Phép:</span> <b>${stats.excused}</b></div>
                    <div style="display:flex; justify-content:space-between; padding: 0 2px; color: #dc2626;"><span>K.Phép:</span> <b>${stats.unexcused}</b></div>
                    <div style="display:flex; justify-content:space-between; padding: 0 2px; color: #4b5563;"><span>Nghỉ:</span> <b>${stats.off}</b></div>
                </div>
            </td>
        `;
    });

    footerHTML += `<td class="sticky-presence" style="right: 80px; background-color: #f8fafc !important; position: sticky; bottom: 0; z-index: 160;"></td><td class="sticky-action" style="right: 0; position: sticky; bottom: 0; z-index: 160;"></td></tr>`;
    tfoot.innerHTML = footerHTML;
}

function handleLocalFileImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON starting from row 7 (index 6)
        // Header is on row 7, data follows
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 6 });
        processImportedData(jsonData);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset
}

function handleDriveImport() {
    const link = document.getElementById('googleSheetLink').value;
    if (!link) {
        showToast('Vui lòng nhập link Google Sheets');
        return;
    }

    // Extract sheet ID from link
    const match = link.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
        showToast('Link Google Sheets không hợp lệ');
        return;
    }

    const sheetId = match[1];
    const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;

    showToast('Đang tải dữ liệu...');

    fetch(exportUrl)
        .then(res => res.arrayBuffer())
        .then(buffer => {
            const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 6 });
            processImportedData(jsonData);
        })
        .catch(err => {
            console.error(err);
            showToast('Lỗi khi tải từ Google Sheets. Hãy đảm bảo sheet ở chế độ công khai (Bất kỳ ai có liên kết).');
        });
}

function processImportedData(rows) {
    if (!rows || rows.length === 0) {
        showToast('Không tìm thấy dữ liệu học sinh');
        return;
    }

    const currentClassId = document.getElementById('classDropdown').dataset.value;
    const schoolId = document.getElementById('schoolDropdown').dataset.value;

    if (!currentClassId) {
        showToast('Vui lòng chọn lớp học trước khi nhập dữ liệu!');
        return;
    }

    const students = Storage.getStudents();
    const gridSettings = Storage.getGridSettings();
    const totalSeats = gridSettings.rows * gridSettings.cols;

    // Get occupied seats in CURRENT class
    const occupiedSeats = students.filter(s => s.classId === currentClassId).map(s => parseInt(s.seat));

    let addedCount = 0;

    rows.forEach(row => {
        if (!row[1]) return; // Name is required

        // Find next empty seat
        let assignedSeat = -1;
        for (let i = 0; i < totalSeats; i++) {
            if (!occupiedSeats.includes(i)) {
                assignedSeat = i;
                occupiedSeats.push(i);
                break;
            }
        }

        if (assignedSeat === -1) return; // No more seats

        const newId = 'HS' + String(students.length + 1).padStart(3, '0') + Date.now().toString().slice(-4);

        // Clean up DOB
        let dobStr = row[2] || 'Chưa cập nhật';
        if (typeof dobStr === 'number') {
            const date = XLSX.utils.format_cell({ v: dobStr, t: 'd' });
            dobStr = date;
        }

        const newStudent = {
            id: newId,
            name: row[1],
            dob: dobStr,
            gender: row[3] || 'Nam',
            seat: assignedSeat,
            avatar: 'default',
            classId: currentClassId,
            subjects: Storage.getSubjects(schoolId).map(s => ({ name: s.name, score: null })),
            notes: row[5] || '',
            conduct: row[4] || 8,
            comments: '',
            averageScore: 0
        };

        students.push(newStudent);
        addedCount++;
    });

    if (addedCount > 0) {
        Storage.saveStudents(students);
        loadStudentsList();
        Classroom.loadClassroom();
        showToast(`Đã nhập thành công ${addedCount} học sinh vào lớp`);
    } else {
        showToast('Không có học sinh mới nào được thêm');
    }
}

function searchStudents(query) {
    const rows = document.querySelectorAll('#studentsTableBody tr');
    const searchTerm = query.toLowerCase().trim();

    rows.forEach(row => {
        const name = row.cells[1].textContent.toLowerCase();
        if (name.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function viewStudentDetails(studentId) {
    const students = Storage.getStudents();
    const student = students.find(s => s.id === studentId);

    if (!student) {
        // alert('Không tìm thấy thông tin học sinh');
        return;
    }

    // Update modal with student info
    document.getElementById('modalStudentName').textContent = student.name;
    document.getElementById('modalStudentId').textContent = `Mã HS: ${student.id}`;
    document.getElementById('modalStudentDob').textContent = `Ngày sinh: ${student.dob}`;
    document.getElementById('modalStudentGender').textContent = `Giới tính: ${student.gender}`;
    document.getElementById('modalStudentNotes').textContent = student.notes ? `Ghi chú: ${student.notes}` : '';

    // Update grades: Use ALL subjects from Global Storage, OR Filter by Selected Subject
    let allSubjects = Storage.getSubjects();
    const selectedSubjectId = document.getElementById('subjectDropdown') ? document.getElementById('subjectDropdown').dataset.value : '';

    if (selectedSubjectId) {
        allSubjects = allSubjects.filter(s => s.id === selectedSubjectId);
    }

    const gradesContainer = document.querySelector('.subject-grades');
    gradesContainer.innerHTML = '';

    // Create a map of existing scores
    const studentScores = {};
    if (student.subjects) {
        student.subjects.forEach(s => {
            studentScores[s.name] = s.score;
        });
    }

    allSubjects.forEach(subject => {
        const score = studentScores[subject.name];
        const gradeElement = document.createElement('div');
        gradeElement.className = 'subject-grade';
        gradeElement.innerHTML = `
            <div class="subject-name">${subject.name}</div>
            <div class="subject-score">${score !== undefined && score !== null ? score : '0.0'}</div>
        `;
        gradesContainer.appendChild(gradeElement);
    });

    // Update average score based on VISIBLE subjects (respecting the filter)
    const activeSubjectNames = allSubjects.map(s => s.name);
    const visibleStudentSubjects = (student.subjects || []).filter(s => activeSubjectNames.includes(s.name));

    const average = calculateAverageScore(visibleStudentSubjects);
    document.getElementById('averageScore').textContent = average.toFixed(1);

    // Load Quick Comments
    if (window.loadQuickComments) {
        window.loadQuickComments(average);
    }

    // Update progress bar
    const progressFill = document.querySelector('.progress-fill:not(.conduct)');
    if (progressFill) {
        progressFill.style.width = `${average * 10}%`;
        progressFill.style.background = 'var(--accent-color)'; // Always Green
    }

    // Update conduct
    const conduct = student.conduct || 0;
    const conductScoreEl = document.getElementById('conductScore');
    if (conductScoreEl) conductScoreEl.textContent = parseFloat(conduct).toFixed(1);

    const conductRange = document.getElementById('conductRange');
    if (conductRange) {
        conductRange.value = conduct;

        const updateRangeFill = (el) => {
            const val = el.value;
            const pct = (val / 10) * 100;
            el.style.background = `linear-gradient(to right, var(--warning-color) 0%, var(--warning-color) ${pct}%, #e0e0e0 ${pct}%, #e0e0e0 100%)`;
        };

        updateRangeFill(conductRange);

        conductRange.oninput = function () {
            const val = parseFloat(this.value).toFixed(1);
            if (conductScoreEl) conductScoreEl.textContent = val;
            updateRangeFill(this);

            // Update classroom seat real-time
            const seat = document.querySelector(`.seat[data-student-id="${studentId}"]`);
            if (seat) {
                const conductBar = seat.querySelector('.stat-bar.conduct');
                if (conductBar) conductBar.style.width = `${this.value * 10}%`;
            }
        };

        conductRange.onchange = function () {
            const val = parseFloat(this.value).toFixed(1);
            const allStudents = Storage.getStudents();
            const sIdx = allStudents.findIndex(s => s.id === studentId);
            if (sIdx !== -1) {
                allStudents[sIdx].conduct = parseFloat(val);
                Storage.saveStudents(allStudents);
                if (window.Classroom) window.Classroom.loadClassroom();
            }
        };
    }

    // Update notes
    document.getElementById('studentNotes').value = student.comments || '';

    // Update save button
    const saveBtn = document.getElementById('saveNotesBtn');
    saveBtn.onclick = function () {
        saveStudentNotes(studentId);
    };

    // Add Edit Button functionality
    let editBtn = document.getElementById('modalEditBtn');
    if (!editBtn) {
        const header = document.querySelector('#studentModal .modal-header');
        editBtn = document.createElement('button');
        editBtn.id = 'modalEditBtn';
        editBtn.className = 'btn-icon';
        editBtn.style.marginRight = '10px';
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        header.insertBefore(editBtn, header.lastElementChild);
    }

    editBtn.onclick = function () {
        editStudent(studentId);
    };

    openModal('studentModal');
}

function saveStudentNotes(studentId) {
    const students = Storage.getStudents();
    const studentIndex = students.findIndex(s => s.id === studentId);

    if (studentIndex !== -1) {
        const comments = document.getElementById('studentNotes').value;
        students[studentIndex].comments = comments;
        Storage.saveStudents(students);

        // Success Toast
        showToast('Đã lưu nhận xét thành công');
    }
}



function calculateAverageScore(subjects) {
    if (!subjects) return 0;
    const scores = subjects.map(s => s.score).filter(s => s !== null && s !== undefined);
    if (scores.length === 0) return 0;
    const sum = scores.reduce((total, score) => total + score, 0);
    return sum / scores.length;
}

function editStudent(studentId) {
    const students = Storage.getStudents();
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    // Populate form
    document.getElementById('newStudentName').value = student.name;
    // DOB handling
    if (student.dob && student.dob.includes('/')) {
        const parts = student.dob.split('/');
        if (parts.length === 3) {
            document.getElementById('newStudentDob').value = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
    } else if (student.dob) {
        document.getElementById('newStudentDob').value = student.dob;
    }

    document.getElementById('newStudentGender').value = student.gender;

    document.getElementById('newStudentNotes').value = student.notes || '';
    document.getElementById('editStudentId').value = student.id;

    const avatarPreview = document.getElementById('avatarPreview');
    if (student.avatar && student.avatar.startsWith('data:image')) {
        avatarPreview.innerHTML = `<img src="${student.avatar}" style="width:100%; height:100%; object-fit:cover; border-radius:50%">`;
        avatarPreview.dataset.base64 = student.avatar;
    } else {
        avatarPreview.innerHTML = '<i class="fas fa-user"></i>';
        delete avatarPreview.dataset.base64;
    }

    document.querySelector('#addStudentModal h3').textContent = 'Chỉnh sửa thông tin học sinh';
    document.getElementById('saveStudentBtn').textContent = 'Lưu thông tin';

    closeModal(document.getElementById('studentModal'));
    openModal('addStudentModal');
}

function initializeSampleData() {
    // Check if we already have data
    // Removed sample data creation to ensure clean state for new users
}

function loadInitialData() {
    setupDropdownListeners();
    refreshAppData();
    if (Classroom.initTransferEvents) Classroom.initTransferEvents();
}

function refreshAppData() {
    renderSchoolDropdown();

    // Set initial school
    const schools = Storage.getSchools();
    if (schools.length > 0) {
        selectSchool(schools[0].id);
    } else {
        // Reset dropdowns if no schools
        document.getElementById('schoolDropdown').querySelector('.selected-text').textContent = 'Chọn trường';
        delete document.getElementById('schoolDropdown').dataset.value;

        renderClassDropdown();
        renderSubjectDropdown();

        // Update display to empty
        document.getElementById('currentSchoolName').textContent = 'Chọn trường';
        document.getElementById('currentClassName').textContent = 'Chọn lớp';
    }
}

function handleAddClass(e) {
    e.preventDefault();
    const name = document.getElementById('newClassName').value;
    const schoolId = document.getElementById('schoolDropdown').dataset.value;

    if (!name || !schoolId) return;

    const newId = 'class' + Date.now();
    const newClass = { id: newId, name: name, schoolId: schoolId, teacherId: 1 };

    Storage.addClass(newClass);
    renderClassDropdown();
    selectClass(newId);

    closeModal(document.getElementById('addClassModal'));
    e.target.reset();
    showToast(`Đã thêm lớp ${name} thành công`);
}

function handleAddSubject(e) {
    e.preventDefault();
    const name = document.getElementById('newSubjectName').value;
    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    if (!name || !schoolId) return;

    Storage.addSubject(name, schoolId);
    renderSubjectDropdown();

    closeModal(document.getElementById('addSubjectModal'));
    e.target.reset();
    showToast(`Đã thêm môn ${name} thành công`);
}

function handleAddSchool(e) {
    e.preventDefault();
    const name = document.getElementById('newSchoolName').value;
    if (!name) return;

    const newSchool = Storage.addSchool(name);
    renderSchoolDropdown();
    selectSchool(newSchool.id);

    closeModal(document.getElementById('addSchoolModal'));
    e.target.reset();
    showToast(`Đã thêm trường ${name} thành công`);
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'success-message';
    toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #4fc3a1;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        toast.style.transition = 'all 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Dropdown Logic
function setupDropdownListeners() {
    // Classes
    const classTrigger = document.getElementById('classDropdownTrigger');
    const classMenu = document.getElementById('classDropdownMenu');

    if (classTrigger) {
        classTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            classMenu.classList.toggle('active');
        });
    }

    // Subjects
    const subjectTrigger = document.getElementById('subjectDropdownTrigger');
    const subjectMenu = document.getElementById('subjectDropdownMenu');

    if (subjectTrigger) {
        subjectTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            subjectMenu.classList.toggle('active');
        });
    }

    // Schools
    const schoolTrigger = document.getElementById('schoolDropdownTrigger');
    const schoolMenu = document.getElementById('schoolDropdownMenu');

    if (schoolTrigger) {
        schoolTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            schoolMenu.classList.toggle('active');
        });
    }

    // Export Students
    const exportTrigger = document.getElementById('exportStudentsBtn');
    const exportMenu = document.getElementById('exportStudentsMenu');

    if (exportTrigger) {
        exportTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exportMenu.classList.toggle('active');
        });
    }

    // Export Students Menu Items
    if (exportMenu) {
        exportMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const mode = item.dataset.mode;
                exportStudentsListToExcel(mode);
                closeAllDropdowns();
            });
        });
    }

    // Export Grades
    const exportGradesTrigger = document.getElementById('exportGradesBtn');
    const exportGradesMenu = document.getElementById('exportGradesMenu');

    if (exportGradesTrigger) {
        exportGradesTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllDropdowns();
            exportGradesMenu.classList.toggle('active');
        });
    }

    if (exportGradesMenu) {
        exportGradesMenu.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const mode = item.dataset.mode;
                Grades.exportExcel(mode); // Updated to accept mode
                closeAllDropdowns();
            });
        });
    }

    // Close on global click
    document.addEventListener('click', () => {
        closeAllDropdowns();
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('active'));
}

function renderClassDropdown() {
    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    const classes = Storage.getClasses(schoolId);
    const menu = document.getElementById('classDropdownMenu');
    if (!menu) return;
    menu.innerHTML = '';

    if (classes.length === 0) {
        menu.innerHTML = '<div class="dropdown-item" style="color: #999; font-style: italic;">Chưa có lớp</div>';
    }

    classes.forEach(cls => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        setupDropdownDrag(item, cls.id, 'class');

        // Highlight logic could be added here
        const current = document.getElementById('classDropdown').dataset.value;
        if (current === cls.id) item.classList.add('selected');

        item.innerHTML = `
            <span onclick="selectClass('${cls.id}')">${cls.name}</span>
            <span class="delete-item-btn" onclick="deleteClass('${cls.id}')">&times;</span>
        `;
        menu.appendChild(item);
    });
}

function selectClass(classId) {
    const classes = Storage.getClasses();
    const cls = classes.find(c => c.id === classId);
    if (cls) {
        document.getElementById('currentClassName').textContent = cls.name;
        document.getElementById('classDropdown').dataset.value = classId;

        Classroom.loadClassroom(classId);
        if (document.getElementById('studentsPage').classList.contains('active')) {
            loadStudentsList();
        } else if (document.getElementById('gradesPage').classList.contains('active')) {
            Grades.loadGrades();
        }
    }
    closeAllDropdowns();
    renderClassDropdown(); // re-render to update selected state styling
    if (Classroom.updateTransferButtons) Classroom.updateTransferButtons();
}

function deleteClass(classId) {
    Storage.deleteClass(classId);

    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    // If currently selected, select another
    const currentId = document.getElementById('classDropdown').dataset.value;
    if (currentId === classId) {
        const classes = Storage.getClasses(schoolId);
        if (classes.length > 0) {
            selectClass(classes[0].id);
        } else {
            document.getElementById('currentClassName').textContent = "Chưa có lớp";
            document.getElementById('classDropdown').dataset.value = '';
            Classroom.renderClassroom([]);
        }
    }
    renderClassDropdown();
    event.stopPropagation();
}

function renderSubjectDropdown() {
    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    const subjects = Storage.getSubjects(schoolId);
    const menu = document.getElementById('subjectDropdownMenu');
    if (!menu) return;
    menu.innerHTML = '';

    // Add "All" option
    const allItem = document.createElement('div');
    allItem.className = 'dropdown-item';
    allItem.innerHTML = `<span onclick="selectSubject('')">Tất cả</span>`;
    menu.appendChild(allItem);

    subjects.forEach(sub => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        setupDropdownDrag(item, sub.id, 'subject');

        // Highlight
        const current = document.getElementById('subjectDropdown').dataset.value;
        if (current === sub.id) item.classList.add('selected');

        item.innerHTML = `
            <span onclick="selectSubject('${sub.id}')">${sub.name}</span>
            <span class="delete-item-btn" onclick="deleteSubject('${sub.id}')">&times;</span>
        `;
        menu.appendChild(item);
    });
}

function selectSubject(subjectId) {
    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    const subjects = Storage.getSubjects(schoolId);
    const subjectDropdown = document.getElementById('subjectDropdown');

    if (!subjectId) {
        document.getElementById('currentSubjectName').textContent = 'Tất cả';
        subjectDropdown.dataset.value = '';
    } else {
        const sub = subjects.find(s => s.id === subjectId);
        if (sub) {
            document.getElementById('currentSubjectName').textContent = sub.name;
            subjectDropdown.dataset.value = subjectId;
        }
    }

    closeAllDropdowns();
    renderSubjectDropdown();

    // Refresh views
    const currentClassId = document.getElementById('classDropdown').dataset.value;
    if (currentClassId) {
        Classroom.loadClassroom(currentClassId);
    }

    if (document.getElementById('gradesPage').classList.contains('active')) {
        Grades.loadGrades();
    }
    if (Classroom.updateTransferButtons) Classroom.updateTransferButtons();
}

function deleteSubject(subjectId) {
    Storage.deleteSubject(subjectId);

    const currentId = document.getElementById('subjectDropdown').dataset.value;
    if (currentId === subjectId) {
        selectSubject('');
    } else {
        renderSubjectDropdown();
    }
    event.stopPropagation();
}

function renderSchoolDropdown() {
    const schools = Storage.getSchools();
    const menu = document.getElementById('schoolDropdownMenu');
    if (!menu) return;
    menu.innerHTML = '';

    schools.forEach(school => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        setupDropdownDrag(item, school.id, 'school');

        const current = document.getElementById('schoolDropdown').dataset.value;
        if (current === school.id) item.classList.add('selected');

        item.innerHTML = `
            <span onclick="selectSchool('${school.id}')">${school.name}</span>
            <span class="delete-item-btn" onclick="deleteSchool('${school.id}')">&times;</span>
        `;
        menu.appendChild(item);
    });
}

function selectSchool(schoolId) {
    const schools = Storage.getSchools();
    const school = schools.find(s => s.id === schoolId);
    if (school) {
        document.getElementById('currentSchoolName').textContent = school.name;
        document.getElementById('schoolDropdown').dataset.value = schoolId;

        // Refresh classes for this school
        renderClassDropdown();
        renderSubjectDropdown();

        // Auto-select first class of this school if available
        const classes = Storage.getClasses(schoolId);
        if (classes.length > 0) {
            selectClass(classes[0].id);
        } else {
            // No classes in this school
            document.getElementById('currentClassName').textContent = "Chọn lớp";
            document.getElementById('classDropdown').dataset.value = '';
            Classroom.renderClassroom([]);
            if (document.getElementById('studentsPage').classList.contains('active')) {
                loadStudentsList();
            }
        }
    }
    closeAllDropdowns();
    renderSchoolDropdown();
    if (Classroom.updateTransferButtons) Classroom.updateTransferButtons();
}

function deleteSchool(schoolId) {
    Storage.deleteSchool(schoolId);

    const currentId = document.getElementById('schoolDropdown').dataset.value;
    if (currentId === schoolId) {
        const schools = Storage.getSchools();
        if (schools.length > 0) {
            selectSchool(schools[0].id);
        } else {
            document.getElementById('currentSchoolName').textContent = "Chưa có trường";
            document.getElementById('schoolDropdown').dataset.value = '';
        }
    }
    renderSchoolDropdown();
    event.stopPropagation();
}

// Globals
window.viewStudentDetails = viewStudentDetails;
window.editStudent = editStudent;
window.openModal = openModal;
window.selectClass = selectClass;
window.deleteClass = deleteClass;
window.deleteSubject = deleteSubject;
window.selectSchool = selectSchool;
window.deleteSchool = deleteSchool;
window.selectSubject = selectSubject;
window.addAttendanceColumn = addAttendanceColumn;
window.updateAttendanceDate = updateAttendanceDate;
window.toggleAttendance = updateAttendanceStatus;
window.updateAttendanceStatus = updateAttendanceStatus;
window.deleteAttendanceSession = deleteAttendanceSession;
window.deleteStudentWrapper = deleteStudentWrapper;


// Attendance Helper Functions
function addAttendanceColumn() {
    const classDropdown = document.getElementById('classDropdown');
    const currentClassId = classDropdown ? classDropdown.dataset.value : '';
    const subjectDropdown = document.getElementById('subjectDropdown');
    const currentSubjectId = subjectDropdown ? subjectDropdown.dataset.value : '';

    if (!currentClassId) {
        alert('Vui lòng chọn lớp học trước!');
        return;
    }

    if (!currentSubjectId) {
        alert('Vui lòng chọn môn học trước!');
        return;
    }

    // 1. Create Session with subjectId
    const newSession = Storage.addAttendanceSession(currentClassId, currentSubjectId);

    // 2. Initialize all students with 'present'
    const students = Storage.getStudents();
    let changed = false;
    students.forEach(s => {
        if (s.classId === currentClassId) {
            if (!s.attendance) s.attendance = {};
            s.attendance[newSession.id] = 'present';
            changed = true;
        }
    });

    if (changed) {
        Storage.saveStudents(students);
    }

    loadStudentsList();
    showToast('Đã thêm cột điểm danh mới');
}

function updateAttendanceDate(sessionId, newDate) {
    Storage.updateAttendanceSession(sessionId, newDate);
    // showToast('Đã cập nhật ngày điểm danh');
}

function deleteAttendanceSession(sessionId) {
    if (confirm('Bạn có chắc chắn muốn xóa cột điểm danh này?')) {
        const sessions = Storage.getAttendanceSessions(null); // Get all
        const newSessions = sessions.filter(s => s.id !== sessionId);
        Storage.saveAttendanceSessions(newSessions);

        // Also clean up student data to save space (optional but good)
        const students = Storage.getStudents();
        let changed = false;
        students.forEach(s => {
            if (s.attendance && s.attendance[sessionId] !== undefined) {
                delete s.attendance[sessionId];
                changed = true;
            }
        });
        if (changed) Storage.saveStudents(students);

        loadStudentsList();
        showToast('Đã xóa cột điểm danh');
    }
}

function updateAttendanceStatus(studentId, sessionId, status) {
    const students = Storage.getStudents();
    const student = students.find(s => s.id === studentId);

    if (student) {
        if (!student.attendance) {
            student.attendance = {};
        }
        student.attendance[sessionId] = status;
        Storage.saveStudents(students);

        // Refresh to update stats colors and counts without full reload if possible, 
        // but full reload is safer for stats update.
        // To avoid focus loss, we could just updatestats, but for now reload is acceptable as it matches previous behavior
        // However, reloading loses focus on the select. 
        // We will TRY to just update styling of the select itself + update the stats cells in the same row?
        // Let's reload for simplicity to ensure sums are correct.
        loadStudentsList();
    }
}

function deleteStudentWrapper(studentId) {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này khỏi danh sách?')) {
        deleteStudent(studentId);
        showToast('Đã xóa học sinh thành công');
    }
}

// Drag & Drop Helpers for Dropdowns
function setupDropdownDrag(item, id, type) {
    item.draggable = true;

    item.addEventListener('dragstart', (e) => {
        // Use a clean JSON object for data
        e.dataTransfer.setData('application/json', JSON.stringify({ id, type }));
        e.dataTransfer.effectAllowed = 'move';
        item.classList.add('dragging');
        e.stopPropagation();
    });

    item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        document.querySelectorAll('.dropdown-item').forEach(i => i.classList.remove('drag-over'));
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!item.classList.contains('dragging')) {
            item.classList.add('drag-over');
        }
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        item.classList.remove('drag-over');

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;

            const data = JSON.parse(rawData);
            if (data.type === type && data.id !== id) {
                handleDropdownReorder(data.id, id, type);
            }
        } catch (err) {
            console.error('Drop error', err);
        }
    });
}

function handleDropdownReorder(draggedId, targetId, type) {
    let fullList = [];
    let subset = [];
    let saveFunc = null;
    let renderFunc = null;
    let schoolId = null;

    if (type === 'school') {
        fullList = Storage.getSchools();
        subset = [...fullList];
        saveFunc = (list) => Storage.saveSchools(list);
        renderFunc = renderSchoolDropdown;
    } else if (type === 'class') {
        schoolId = document.getElementById('schoolDropdown').dataset.value;
        fullList = Storage.getClasses();
        subset = Storage.getClasses(schoolId);
        saveFunc = (list) => Storage.saveClasses(list);
        renderFunc = renderClassDropdown;
    } else if (type === 'subject') {
        schoolId = document.getElementById('schoolDropdown').dataset.value;
        fullList = Storage.getSubjects();
        subset = Storage.getSubjects(schoolId);
        saveFunc = (list) => Storage.saveSubjects(list);
        renderFunc = renderSubjectDropdown;
    }

    const draggedIndex = subset.findIndex(i => i.id === draggedId);
    const targetIndex = subset.findIndex(i => i.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const [draggedItem] = subset.splice(draggedIndex, 1);
    subset.splice(targetIndex, 0, draggedItem);

    let resultList = [];

    if (type === 'school') {
        resultList = subset;
    } else {
        const otherItems = fullList.filter(item => item.schoolId !== schoolId);
        resultList = [...otherItems, ...subset];
    }

    saveFunc(resultList);
    renderFunc();
}

// App Settings & User Info Logic
document.addEventListener('DOMContentLoaded', () => {
    // This runs after the main DOMContentLoaded because of defer/script order or just appended
    // But since we are appending to the file which is inside a DOMContentLoaded wrapper... 
    // Wait, the whole app.js is wrapped in DOMContentLoaded? 
    // Yes, line 2: document.addEventListener('DOMContentLoaded', function () { ...
    // So appending OUTSIDE that wrapper is fine, but elements might not be ready if script runs in head?
    // Script is at end of body in index.html (line 800+). So elements are ready.

    const appSettingsBtn = document.getElementById('appSettingsBtn');
    if (appSettingsBtn) {
        appSettingsBtn.addEventListener('click', () => {
            const teacher = Storage.getTeacher();
            if (teacher) {
                const emailEl = document.getElementById('settingsUserEmail');
                const nameEl = document.getElementById('settingsUserName');
                if (emailEl) emailEl.textContent = teacher.email;
                if (nameEl) nameEl.textContent = teacher.name;
            }
            openModal('appSettingsModal');
        });
    }
});

function exportStudentsListToExcel(mode) {
    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    if (!schoolId) {
        showToast('Vui lòng chọn trường học');
        return;
    }

    const schoolName = document.getElementById('currentSchoolName').textContent;
    const subjectDropdown = document.getElementById('subjectDropdown');
    const subjectId = subjectDropdown ? subjectDropdown.dataset.value : null;
    const subjectName = subjectDropdown ? subjectDropdown.querySelector('.selected-text').textContent : 'Tất cả môn';

    const workbook = XLSX.utils.book_new();

    if (mode === 'current') {
        const classId = document.getElementById('classDropdown').dataset.value;
        const className = document.getElementById('currentClassName').textContent;

        if (!classId) {
            showToast('Vui lòng chọn lớp học');
            return;
        }

        const ws = createClassWorksheet(classId, className, schoolName, subjectId, subjectName);
        if (ws) {
            XLSX.utils.book_append_sheet(workbook, ws, className.substring(0, 31));
            const fileName = `Danh sách điểm danh_${className}_${schoolName}_${subjectName}`.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
            showToast(`Đã xuất danh sách lớp ${className}`);
        } else {
            showToast('Lớp học này chưa có học sinh');
        }
    } else if (mode === 'all') {
        const classes = Storage.getClasses(schoolId);
        if (classes.length === 0) {
            showToast('Không có lớp học nào trong trường này');
            return;
        }

        let addedSheets = 0;
        classes.forEach(cls => {
            const ws = createClassWorksheet(cls.id, cls.name, schoolName, subjectId, subjectName);
            if (ws) {
                // Sheet names must be <= 31 chars and unique
                let baseSheetName = cls.name.substring(0, 31);
                let finalSheetName = baseSheetName;
                let counter = 1;
                while (workbook.SheetNames.includes(finalSheetName)) {
                    finalSheetName = baseSheetName.substring(0, 28) + '(' + counter + ')';
                    counter++;
                }
                XLSX.utils.book_append_sheet(workbook, ws, finalSheetName);
                addedSheets++;
            }
        });

        if (addedSheets > 0) {
            const fileName = `Danh sách điểm danh_${schoolName}_${subjectName}`.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
            XLSX.writeFile(workbook, `${fileName}.xlsx`);
            showToast(`Đã xuất danh sách ${addedSheets} lớp học`);
        } else {
            showToast('Không có dữ liệu học sinh để xuất');
        }
    }
}

function createClassWorksheet(classId, className, schoolName, subjectId, subjectName) {
    const students = Storage.getStudents().filter(s => s.classId === classId);
    if (students.length === 0) return null;

    const sessions = Storage.getAttendanceSessions(classId, subjectId);

    // Header Metadata
    const headerMetadata = [
        ['DANH SÁCH HỌC SINH VÀ ĐIỂM DANH'],
        [`Trường: ${schoolName}`],
        [`Lớp: ${className}${subjectName && subjectName !== 'Tất cả môn' ? ' - Môn: ' + subjectName : ''}`],
        [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
        []
    ];

    // Table Header
    const tableHeader = ['STT', 'Họ và Tên', 'Ngày sinh', 'Giới tính'];
    sessions.forEach(s => {
        tableHeader.push(s.date);
    });
    tableHeader.push('Chuyên cần');
    tableHeader.push('Ghi chú');

    // Table Body
    const tableBody = students.map((s, i) => {
        const row = [
            i + 1,
            s.name,
            s.dob || '',
            s.gender || ''
        ];

        let presentCount = 0;
        sessions.forEach(session => {
            const status = (s.attendance && s.attendance[session.id]) || 'present';
            let statusText = 'Có';
            if (status === 'present') {
                statusText = 'Có';
                presentCount++;
            } else if (status === 'excused') statusText = 'C.Phép';
            else if (status === 'unexcused') statusText = 'K.Phép';
            else if (status === 'off') statusText = 'Nghỉ';
            row.push(statusText);
        });

        // Chuyên cần stat
        row.push(sessions.length > 0 ? `${presentCount}/${sessions.length}` : '0/0');
        row.push(s.notes || s.comments || '');

        return row;
    });

    const finalData = [...headerMetadata, tableHeader, ...tableBody];
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    const totalCols = tableHeader.length;
    const merges = [];
    for (let i = 0; i < 4; i++) {
        merges.push({ s: { r: i, c: 0 }, e: { r: i, c: totalCols - 1 } });
    }
    ws['!merges'] = merges;

    const wscols = tableHeader.map((h, i) => {
        let max = h.toString().length;
        tableBody.forEach(row => {
            const cellVal = row[i] ? row[i].toString().length : 0;
            if (cellVal > max) max = cellVal;
        });
        return { wch: Math.min(max + 5, 40) };
    });
    ws['!cols'] = wscols;

    return ws;
}

// Global Help Helpers
window.copyToClipboard = function (text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Đã sao chép: ' + text);
    }).catch(err => {
        console.error('Lỗi khi copy: ', err);
    });
};

// Word Help Modal Listener
document.addEventListener('DOMContentLoaded', () => {
    const wordHelpBtn = document.getElementById('wordHelpBtn');
    if (wordHelpBtn) {
        wordHelpBtn.addEventListener('click', () => openModal('wordHelpModal'));
    }
});