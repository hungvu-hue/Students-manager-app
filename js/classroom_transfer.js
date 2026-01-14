
// Transfer Logic Extension for Classroom
Classroom.initTransferEvents = function () {
    // Buttons
    const transferBtn = document.getElementById('transferClassBtn');
    const notificationBtn = document.getElementById('notificationBtn');

    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            const currentClassName = document.getElementById('currentClassName').textContent;
            document.getElementById('transferClassNameDisplay').textContent = currentClassName;

            // Populate groups for transfer select
            Classroom.populateTransferGroups();

            openModal('transferClassModal');
        });
    }

    // Group selection in transfer modal
    const groupSelect = document.getElementById('transferGroupSelect');
    if (groupSelect) {
        groupSelect.addEventListener('change', (e) => {
            Classroom.renderTransferTeachers(e.target.value);
        });
    }

    if (notificationBtn) {
        notificationBtn.addEventListener('click', () => {
            const currentUser = Storage.getTeacher();
            if (!currentUser) return;

            const pendingTransfers = Storage.getPendingTransfersForUser(currentUser.email);
            if (pendingTransfers.length === 0) {
                showToast('Không có thông báo mới');
                return;
            }

            const schoolName = document.getElementById('currentSchoolName').textContent;
            document.getElementById('receiveSchoolNameDisplay').textContent = schoolName;
            Classroom.renderPendingTransfersList();
            openModal('receiveClassModal');
        });
    }

    // Forms
    const transferForm = document.getElementById('transferClassForm');
    if (transferForm) {
        transferForm.addEventListener('submit', Classroom.handleTransferSubmit);
    }

    // Initialize notification badge
    Classroom.updateNotificationBadge();
};

Classroom.updateNotificationBadge = function () {
    const currentUser = Storage.getTeacher();
    if (!currentUser) return;

    const pendingTransfers = Storage.getPendingTransfersForUser(currentUser.email);
    const badge = document.getElementById('notificationBadge');

    if (badge) {
        if (pendingTransfers.length > 0) {
            badge.textContent = pendingTransfers.length;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
};

Classroom.updateTransferButtons = function () {
    const schoolId = document.getElementById('schoolDropdown').dataset.value;
    const classId = document.getElementById('classDropdown').dataset.value;
    const subjectId = document.getElementById('subjectDropdown').dataset.value;
    const currentUser = Storage.getTeacher();

    const transferBtn = document.getElementById('transferClassBtn');

    if (!currentUser) return;

    // Show Transfer Button if School, Class AND Subject are selected
    if (transferBtn) {
        if (schoolId && classId && classId !== 'undefined' && subjectId) {
            // "Light up" - Active State
            transferBtn.style.opacity = '1';
            transferBtn.style.cursor = 'pointer';
            transferBtn.style.pointerEvents = 'auto';
            transferBtn.style.boxShadow = '0 2px 4px rgba(243, 156, 18, 0.2)';
            transferBtn.disabled = false;
        } else {
            // "Dim/Off" - Disabled State
            transferBtn.style.opacity = '0.4';
            transferBtn.style.cursor = 'not-allowed';
            transferBtn.style.pointerEvents = 'none';
            transferBtn.style.boxShadow = 'none';
            transferBtn.disabled = true;
        }
        // Always show it now (it's in the header)
        transferBtn.style.display = 'flex';
    }

    // Update notification badge
    Classroom.updateNotificationBadge();
};

Classroom.handleTransferSubmit = function (e) {
    e.preventDefault();
    const toEmail = document.getElementById('transferEmailInput').value.trim();
    const currentClassId = document.getElementById('classDropdown').dataset.value;
    const currentClassName = document.getElementById('currentClassName').textContent;
    const currentSubjectId = document.getElementById('subjectDropdown').dataset.value;
    const currentUser = Storage.getTeacher();

    if (!toEmail || !currentClassId) return;

    if (!currentSubjectId) {
        alert('Vui lòng chọn môn học để chuyển dữ liệu điểm số!');
        return;
    }

    if (toEmail.toLowerCase() === currentUser.email.toLowerCase()) {
        alert('Bạn không thể chuyển lớp cho chính mình!');
        return;
    }

    // Get Data
    // We only transfer the selected subject data for grades if a subject is selected
    // Otherwise we just transfer without specific subject focus (all logic intact)
    const students = Storage.getStudents().filter(s => s.classId === currentClassId);

    // Determine the "Sending Subject Name" for mapping
    let senderSubjectName = null;
    if (currentSubjectId) {
        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        const subjects = Storage.getSubjects(schoolId);
        const sub = subjects.find(s => s.id === currentSubjectId);
        if (sub) senderSubjectName = sub.name;
    }

    const currentSchoolName = document.getElementById('currentSchoolName').textContent;

    // Get Attendance Sessions
    const attendanceSessions = Storage.getAttendanceSessions(currentClassId);

    // Create Transfer Object
    const transferData = {
        id: 'trans-' + Date.now(),
        fromUser: currentUser.email,
        fromName: currentUser.name,
        toUser: toEmail,
        className: currentClassName,
        senderSubjectName: senderSubjectName,
        senderSchoolName: currentSchoolName, // Added School Name
        students: students,
        attendanceSessions: attendanceSessions,
        date: new Date().toISOString()
    };

    // Save Transfer
    Storage.addTransfer(transferData);

    // Delete Class (and students) from Sender
    Storage.deleteClass(currentClassId);

    const allStudents = Storage.getStudents();
    const remainingStudents = allStudents.filter(s => s.classId !== currentClassId);
    Storage.saveStudents(remainingStudents);

    // Clean up attendance sessions
    const allSessions = Storage.getAttendanceSessions(null);
    const remainingSessions = allSessions.filter(s => s.classId !== currentClassId);
    Storage.saveAttendanceSessions(remainingSessions);

    // Close Modal & Reset UI
    closeModal(document.getElementById('transferClassModal'));
    e.target.reset();

    alert(`Đã chuyển lớp "${currentClassName}" cho giáo viên ${toEmail} thành công. Lớp học đã được xóa khỏi danh sách của bạn.`);

    // Refresh Page
    window.location.reload();
};

Classroom.renderPendingTransfersList = function () {
    const list = document.getElementById('pendingTransfersList');
    const currentUser = Storage.getTeacher();
    const transfers = Storage.getPendingTransfersForUser(currentUser.email);

    const currentSchoolId = document.getElementById('schoolDropdown').dataset.value;
    const currentSubjectId = document.getElementById('subjectDropdown').dataset.value;
    // Explicit boolean conversion for template literal safety
    const isReady = !!(currentSchoolId && currentSubjectId);

    list.innerHTML = '';

    if (transfers.length === 0) {
        list.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;">Không có lời mời nào.</div>';
        return;
    }

    if (!isReady) {
        const warning = document.createElement('div');
        warning.style.cssText = 'background: #fff3cd; color: #856404; padding: 10px; margin-bottom: 10px; border-radius: 4px; font-size: 0.9rem; border: 1px solid #ffeeba; display: flex; align-items: center; gap: 8px;';
        warning.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Vui lòng chọn <b>Trường học</b> và <b>Môn học</b> trên thanh công cụ để nhận lớp.';
        list.appendChild(warning);
    }

    transfers.forEach(t => {
        const item = document.createElement('div');
        item.style.cssText = 'background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;';

        const date = new Date(t.date).toLocaleDateString('vi-VN');
        const schoolName = t.senderSchoolName ? t.senderSchoolName : 'Không xác định';
        const subjectName = t.senderSubjectName ? t.senderSubjectName : '';

        // Format: Từ: Name (email) Trường: ... Môn: ...

        item.innerHTML = `
            <div>
                <div style="font-weight: bold; color: var(--primary-color); font-size: 1.1rem;">${t.className}</div>
                <div style="font-size: 0.9rem; color: #333; margin-top: 5px;">
                    <i class="fas fa-user-tie"></i> Từ: <b>${t.fromName}</b> (${t.fromUser})
                </div>
                <div style="font-size: 0.85rem; color: #555; margin-top: 3px; display: flex; gap: 10px; flex-wrap: wrap;">
                    <span><i class="fas fa-school"></i> Trường: <b>${schoolName}</b></span>
                    ${subjectName ? `<span><i class="fas fa-book"></i> Môn: <b>${subjectName}</b></span>` : ''}
                </div>
                <div style="font-size: 0.8rem; color: #999; margin-top: 5px;">
                    <i class="far fa-clock"></i> ${date} • ${t.students.length} học sinh
                </div>
            </div>
            <div style="display: flex; gap: 5px;">
                <button class="btn-primary" 
                    onclick="if(${isReady}) { Classroom.acceptTransfer('${t.id}') } else { alert('Vui lòng chọn Trường và Môn học trước!'); }" 
                    style="background-color: ${isReady ? '#27ae60' : '#95a5a6'}; cursor: ${isReady ? 'pointer' : 'not-allowed'}; opacity: ${isReady ? '1' : '0.6'};">
                    <i class="fas fa-check"></i> Nhận
                </button>
                <button class="btn-secondary" onclick="Classroom.rejectTransfer('${t.id}')" style="color: #c0392b; border-color: #c0392b;">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        list.appendChild(item);
    });
};

Classroom.acceptTransfer = function (transferId) {
    const transfer = Storage.getTransfers().find(t => t.id === transferId);
    if (!transfer) return;

    const currentSchoolId = document.getElementById('schoolDropdown').dataset.value;
    const currentSubjectId = document.getElementById('subjectDropdown').dataset.value;

    if (!currentSchoolId || !currentSubjectId) {
        alert('Vui lòng chọn Trường học và Môn học trước khi nhận lớp!');
        return;
    }

    // Determine Receiver's Subject Name
    let targetSubjectName = null;
    if (currentSubjectId) {
        const subjects = Storage.getSubjects(currentSchoolId);
        const sub = subjects.find(s => s.id === currentSubjectId);
        if (sub) targetSubjectName = sub.name;
    }

    // 1. Create Class in Current School
    const newClassId = 'class' + Date.now();
    const newClass = {
        id: newClassId,
        name: transfer.className,
        schoolId: currentSchoolId
    };
    Storage.addClass(newClass);

    // 2. Process Attendance Sessions
    const sessionMap = {};

    if (transfer.attendanceSessions && transfer.attendanceSessions.length > 0) {
        const allSessions = Storage.getAttendanceSessions(null);

        transfer.attendanceSessions.forEach(oldSession => {
            const newSessionId = 'att_' + Date.now() + Math.random().toString(36).substr(2, 5);
            sessionMap[oldSession.id] = newSessionId;

            allSessions.push({
                id: newSessionId,
                classId: newClassId,
                subjectId: currentSubjectId, // Assign to new subject context
                date: oldSession.date
            });
        });

        Storage.saveAttendanceSessions(allSessions);
    }

    // 3. Add Students & Remap Data
    const allStudents = Storage.getStudents();
    const recipientSubjects = Storage.getSubjects(currentSchoolId);

    transfer.students.forEach((s) => {
        // Update Class ID
        s.classId = newClassId;
        // Important: Reset ID to avoid collision if importing across users/systems (though unlikely with UUIDs)
        // But for safety, we usually keep ID for tracking unless user wants new IDs.
        // Let's keep ID to allow re-import updates in future maybe? 
        // Or generate new ID? Code kept old ID.

        // Remap Attendance
        if (s.attendance) {
            const newAttendance = {};
            for (const [oldSessId, status] of Object.entries(s.attendance)) {
                if (sessionMap[oldSessId]) {
                    newAttendance[sessionMap[oldSessId]] = status;
                }
            }
            s.attendance = newAttendance;
        }

        // Remap Subject Grades
        const oldSubjects = s.subjects || [];
        const newSubjects = recipientSubjects.map(rSub => ({
            name: rSub.name,
            score: null,
            assessments: []
        }));

        if (targetSubjectName) {
            // Priority 1: Exact Name Match
            let sourceData = oldSubjects.find(sub => sub.name === transfer.senderSubjectName);

            // Priority 2: Fallback to any subject with data if strict match fails (User Intent Heuristic)
            if (!sourceData && oldSubjects.length > 0) {
                // If old subjects has data but name differs (e.g. "Math" vs "Toán"), take the one with most assessments?
                const subjectsWithData = oldSubjects.filter(sub => sub.score !== null || (sub.assessments && sub.assessments.length > 0));
                if (subjectsWithData.length === 1) {
                    sourceData = subjectsWithData[0];
                }
            }

            // Priority 3: Direct name match with Target Name (if sender sent "Toán" and we have "Toán")
            if (!sourceData) {
                sourceData = oldSubjects.find(sub => sub.name === targetSubjectName);
            }

            const targetIndex = newSubjects.findIndex(ns => ns.name === targetSubjectName);

            if (sourceData && targetIndex !== -1) {
                newSubjects[targetIndex] = {
                    ...sourceData,
                    name: targetSubjectName // Ensure name consistency
                };
            }
        }

        s.subjects = newSubjects;
        allStudents.push(s);
    });

    Storage.saveStudents(allStudents);

    // 4. Delete Transfer
    Storage.deleteTransfer(transferId);

    // 5. Refresh
    closeModal(document.getElementById('receiveClassModal'));
    alert(`Đã tiếp nhận lớp ${transfer.className} thành công!`);

    // Select the new class to show immediately
    const classDropdown = document.getElementById('classDropdown');
    if (classDropdown) {
        // We can't easily auto-select because page reloads.
        // We rely on reload.
    }
    window.location.reload();
};

Classroom.rejectTransfer = function (transferId) {
    if (confirm('Bạn có chắc muốn từ chối và xóa lời mời này?')) {
        Storage.deleteTransfer(transferId);
        Classroom.renderPendingTransfersList();
        Classroom.updateTransferButtons();
    }
};

Classroom.populateTransferGroups = function () {
    const select = document.getElementById('transferGroupSelect');
    if (!select) return;

    const groups = Storage.getGroups();
    select.innerHTML = '<option value="">-- Chọn nhóm giáo viên --</option>';


    groups.forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = g.name;
        select.appendChild(opt);
    });

    // Reset teacher list
    document.getElementById('transferTeacherList').innerHTML = '<p style="font-size: 0.75rem; color: #999; text-align: center;">Chọn nhóm để xem thành viên</p>';
};

Classroom.renderTransferTeachers = function (groupId) {
    const list = document.getElementById('transferTeacherList');
    if (!list) return;

    if (!groupId) {
        list.innerHTML = '<p style="font-size: 0.75rem; color: #999; text-align: center;">Chọn nhóm để xem thành viên</p>';
        return;
    }

    const teachers = Storage.getAuthorizedTeachers();
    const currentUser = Storage.getTeacher();
    let members = [];

    const groups = Storage.getGroups();
    const group = groups.find(g => g.id === groupId);
    if (group) members = group.members;

    // Filter out current user
    members = members.filter(email => email.toLowerCase() !== currentUser.email.toLowerCase());

    if (members.length === 0) {
        list.innerHTML = '<p style="font-size: 0.75rem; color: #999; text-align: center;">Không có thành viên nào khác</p>';
        return;
    }

    list.innerHTML = '';
    members.forEach(email => {
        const teacher = teachers.find(t => t.email === email);
        if (!teacher || teacher.isLocked) return;

        const el = document.createElement('div');
        el.style = 'padding: 6px 10px; border-radius: 4px; cursor: pointer; transition: all 0.2s; font-size: 0.85rem; border-bottom: 1px solid #f0f0f0;';
        el.onmouseover = () => el.style.background = '#eef2f7';
        el.onmouseout = () => el.style.background = 'transparent';
        el.onclick = () => {
            document.getElementById('transferEmailInput').value = email;
            showToast(`Đã chọn: ${teacher.name}`);
        };

        el.innerHTML = `
            <div style="font-weight: 500;">${teacher.name}</div>
            <div style="font-size: 0.75rem; color: #666;">${email}</div>
        `;
        list.appendChild(el);
    });
};
