// Local Storage Management
const Storage = {
    // Generic Helper for User-Specific Keys
    getUserKey: function (key) {
        const teacher = this.getTeacher();
        if (!teacher || !teacher.email) return null;
        return teacher.email.toLowerCase().trim() + '_' + key;
    },

    // Teacher data (Session)
    saveTeacher: function (teacher) {
        localStorage.setItem('teacher', JSON.stringify(teacher));
    },

    getTeacher: function () {
        const teacher = localStorage.getItem('teacher');
        return teacher ? JSON.parse(teacher) : null;
    },

    removeTeacher: function () {
        localStorage.removeItem('teacher');
    },

    // Students data
    saveStudents: function (students) {
        const key = this.getUserKey('students');
        if (key) localStorage.setItem(key, JSON.stringify(students));
    },

    getStudents: function () {
        const key = this.getUserKey('students');
        if (!key) return [];
        const students = localStorage.getItem(key);
        return students ? JSON.parse(students) : [];
    },

    // Classes data
    saveClasses: function (classes) {
        const key = this.getUserKey('classes');
        if (key) localStorage.setItem(key, JSON.stringify(classes));
    },

    getClasses: function (schoolId) {
        const key = this.getUserKey('classes');
        if (!key) return [];
        const classes = localStorage.getItem(key);
        const allClasses = classes ? JSON.parse(classes) : [];

        // If specific schoolId requested, filter
        if (schoolId) {
            return allClasses.filter(c => c.schoolId === schoolId);
        }

        return allClasses;
    },

    addClass: function (newClass) {
        const classes = this.getClasses(); // Gets user-specific
        classes.push(newClass);
        this.saveClasses(classes);
    },

    deleteClass: function (classId) {
        const classes = this.getClasses();
        const newClasses = classes.filter(c => c.id !== classId);
        this.saveClasses(newClasses);

        // Remove associated attendance sessions
        this.deleteAttendanceSessionsForClass(classId);
    },

    deleteAttendanceSessionsForClass: function (classId) {
        const key = this.getUserKey('attendanceSessions');
        if (!key) return;
        let sessions = this.getAttendanceSessions(null);
        sessions = sessions.filter(s => s.classId !== classId);
        this.saveAttendanceSessions(sessions);
    },

    // Subjects data
    saveSubjects: function (subjects) {
        const key = this.getUserKey('subjects');
        if (key) localStorage.setItem(key, JSON.stringify(subjects));
    },

    getSubjects: function (schoolId) {
        const key = this.getUserKey('subjects');
        if (!key) return [];
        const subjectsStr = localStorage.getItem(key);
        let allSubjects = subjectsStr ? JSON.parse(subjectsStr) : [];

        // Filter by schoolId
        if (schoolId) {
            return allSubjects.filter(s => s.schoolId === schoolId);
        }

        return allSubjects;
    },

    addSubject: function (name, schoolId) {
        if (!schoolId) return null;
        const allSubjects = this.getSubjects();
        const newSubject = {
            id: 'sub' + Date.now(),
            name: name,
            schoolId: schoolId
        };
        allSubjects.push(newSubject);
        this.saveSubjects(allSubjects);
        return newSubject;
    },

    deleteSubject: function (subjectId) {
        const allSubjects = this.getSubjects();
        const newSubjects = allSubjects.filter(s => s.id !== subjectId);
        this.saveSubjects(newSubjects);
    },

    // Grid Settings
    // Grid Settings
    saveGridSettings: function (settings, subjectId = null) {
        let keyName = 'gridSettings';
        if (subjectId) {
            keyName = `gridSettings_${subjectId}`;
        }
        const key = this.getUserKey(keyName);
        if (key) localStorage.setItem(key, JSON.stringify(settings));
    },

    getGridSettings: function (subjectId = null) {
        // 1. Try to get subject-specific settings first
        if (subjectId) {
            const subjectKey = this.getUserKey(`gridSettings_${subjectId}`);
            if (subjectKey) {
                const subjectSettings = localStorage.getItem(subjectKey);
                if (subjectSettings) {
                    return JSON.parse(subjectSettings);
                }
            }
        }

        // 2. Fall back to global/default settings
        const key = this.getUserKey('gridSettings');
        if (!key) return { rows: 10, cols: 6, size: 100 };
        const settings = localStorage.getItem(key);
        if (settings) {
            const parsed = JSON.parse(settings);
            // Migrate old default 10x10 to 10x6 and save the new default
            if (parsed.rows === 10 && parsed.cols === 10 && parsed.size === 100) {
                const newSettings = { rows: 10, cols: 6, size: 100 };
                // Only update the global default if that's what we were checking
                if (!subjectId) {
                    localStorage.setItem(key, JSON.stringify(newSettings));
                }
                return newSettings;
            }
            return parsed;
        }
        return { rows: 10, cols: 6, size: 100 };
    },

    // Schools data
    saveSchools: function (schools) {
        const key = this.getUserKey('schools');
        if (key) localStorage.setItem(key, JSON.stringify(schools));
    },

    getSchools: function () {
        const key = this.getUserKey('schools');
        if (!key) return [];
        const schools = localStorage.getItem(key);

        // No default "Amsterdam" school created anymore
        return schools ? JSON.parse(schools) : [];
    },

    addSchool: function (name) {
        const schools = this.getSchools();
        const teacher = this.getTeacher();
        if (!teacher) return null;

        const newSchool = {
            id: 'school' + Date.now(),
            name: name,
            owner: teacher.email
        };
        schools.push(newSchool);
        this.saveSchools(schools);
        return newSchool;
    },

    deleteSchool: function (schoolId) {
        const schools = this.getSchools();
        const newSchools = schools.filter(s => s.id !== schoolId);
        this.saveSchools(newSchools);
    },

    // Full Backup and Restore
    exportData: function () {
        const data = {
            schools: this.getSchools(),
            classes: this.getClasses(),
            subjects: this.getSubjects(),
            students: this.getStudents(),
            attendanceSessions: this.getAttendanceSessions(null),
            gridSettings: this.getGridSettings(),
            gradeFormulas: this.getFormulas(),
            displaySettings: this.getDisplaySettings(),
            sharingSettings: this.getSharingSettings(),
            exportDate: new Date().toISOString(),
            version: '1.1'
        };
        return JSON.stringify(data, null, 2);
    },

    exportClassData: function (classId, schoolId) {
        const allSchools = this.getSchools();
        const allClasses = this.getClasses();
        const allStudents = this.getStudents();
        const allSessions = this.getAttendanceSessions(null);

        const data = {
            schools: allSchools.filter(s => s.id === schoolId),
            classes: allClasses.filter(c => c.id === classId),
            subjects: this.getSubjects(schoolId),
            students: allStudents.filter(s => s.classId === classId),
            attendanceSessions: allSessions.filter(s => s.classId === classId),
            gridSettings: this.getGridSettings(), // Subject specific not easily filtered here but ok
            exportDate: new Date().toISOString(),
            type: 'single-class',
            version: '1.1'
        };
        return JSON.stringify(data, null, 2);
    },

    importData: function (jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.schools) this.saveSchools(data.schools);
            if (data.classes) this.saveClasses(data.classes);
            if (data.subjects) this.saveSubjects(data.subjects);
            if (data.students) this.saveStudents(data.students);
            if (data.attendanceSessions) this.saveAttendanceSessions(data.attendanceSessions);
            if (data.gridSettings) this.saveGridSettings(data.gridSettings);
            if (data.gradeFormulas) this.saveFormulas(data.gradeFormulas);
            if (data.displaySettings) this.saveDisplaySettings(data.displaySettings);
            if (data.sharingSettings) this.saveSharingSettings(data.sharingSettings);
            if (data.wordTemplate) this.saveWordTemplate(data.wordTemplate);
            return true;
        } catch (e) {
            console.error("Import failed:", e);
            return false;
        }
    },

    // Sharing Settings
    saveSharingSettings: function (settings) {
        const key = this.getUserKey('sharingSettings');
        if (key) localStorage.setItem(key, JSON.stringify(settings));
    },

    getSharingSettings: function () {
        const key = this.getUserKey('sharingSettings');
        if (!key) return { isEnabled: false, sharedClasses: [] };
        const settings = localStorage.getItem(key);
        return settings ? JSON.parse(settings) : { isEnabled: false, sharedClasses: [] };
    },

    // Attendance Data
    saveAttendanceSessions: function (sessions) {
        const key = this.getUserKey('attendanceSessions');
        if (key) localStorage.setItem(key, JSON.stringify(sessions));
    },

    getAttendanceSessions: function (classId, subjectId = null) {
        const key = this.getUserKey('attendanceSessions');
        if (!key) return [];
        const sessions = localStorage.getItem(key);
        const allSessions = sessions ? JSON.parse(sessions) : [];
        if (!classId) return allSessions;

        // Filter by classId and optionally by subjectId
        let filtered = allSessions.filter(s => s.classId === classId);
        if (subjectId) {
            filtered = filtered.filter(s => s.subjectId === subjectId);
        }
        return filtered;
    },

    addAttendanceSession: function (classId, subjectId = null) {
        const allSessions = this.getAttendanceSessions(null);
        const newSession = {
            id: 'att_' + Date.now(),
            classId: classId,
            subjectId: subjectId, // Add subject ID
            date: new Date().toISOString().split('T')[0]
        };
        allSessions.push(newSession);
        this.saveAttendanceSessions(allSessions);
        return newSession;
    },

    updateAttendanceSession: function (sessionId, newDate) {
        const allSessions = this.getAttendanceSessions(null);
        const session = allSessions.find(s => s.id === sessionId);
        if (session) {
            session.date = newDate;
            this.saveAttendanceSessions(allSessions);
        }
    },

    // Math Formulas
    saveFormulas: function (formulas) {
        const key = this.getUserKey('gradeFormulas');
        if (key) localStorage.setItem(key, JSON.stringify(formulas));
    },

    getFormulas: function () {
        const key = this.getUserKey('gradeFormulas');
        if (!key) return {};
        const formulas = localStorage.getItem(key);
        return formulas ? JSON.parse(formulas) : {};
    },

    // Display Settings (which column to show on map)
    saveDisplaySettings: function (settings) {
        const key = this.getUserKey('displaySettings');
        if (key) localStorage.setItem(key, JSON.stringify(settings));
    },

    getDisplaySettings: function () {
        const key = this.getUserKey('displaySettings');
        if (!key) return {};
        const settings = localStorage.getItem(key);
        return settings ? JSON.parse(settings) : {};
    },

    // Word Template (Base64)
    saveWordTemplate: function (base64) {
        const key = this.getUserKey('wordTemplate');
        if (key) localStorage.setItem(key, base64);
    },

    getWordTemplate: function () {
        const key = this.getUserKey('wordTemplate');
        if (!key) return null;
        return localStorage.getItem(key);
    },

    removeWordTemplate: function () {
        const key = this.getUserKey('wordTemplate');
        if (key) localStorage.removeItem(key);
    },

    // Custom Word Tags
    saveCustomWordTags: function (tags) {
        const key = this.getUserKey('customWordTags');
        if (key) localStorage.setItem(key, JSON.stringify(tags));
    },

    getCustomWordTags: function () {
        const key = this.getUserKey('customWordTags');
        if (!key) return [];
        const tags = localStorage.getItem(key);
        return tags ? JSON.parse(tags) : [];
    },

    // Teacher Management (Auth)
    getAuthorizedTeachers: function () {
        let teachers = localStorage.getItem('authorizedTeachers');

        if (!teachers) {
            // Default sole admin account
            const defaults = [
                { email: 'admin@hdu.com', name: 'Quản trị viên', role: 'admin', password: '123456', isLocked: false }
            ];
            this.saveAuthorizedTeachers(defaults);
            return defaults;
        }

        teachers = JSON.parse(teachers);

        // Migration: Ensure all teachers have a password field
        let changed = false;
        teachers.forEach(t => {
            if (!t.password) {
                t.password = '123456';
                changed = true;
            }
        });

        // Ensure admin@hdu.com exists and is admin
        const adminIndex = teachers.findIndex(t => t.email === 'admin@hdu.com');
        if (adminIndex === -1) {
            teachers.push({ email: 'admin@hdu.com', name: 'Quản trị viên', role: 'admin', password: '123456', isLocked: false });
            changed = true;
        }

        if (changed) this.saveAuthorizedTeachers(teachers);

        return teachers;
    },

    saveAuthorizedTeachers: function (teachers) {
        localStorage.setItem('authorizedTeachers', JSON.stringify(teachers));
    },

    addAuthorizedTeacher: function (email, name) {
        const teachers = this.getAuthorizedTeachers();
        if (teachers.find(t => t.email === email)) return false;
        teachers.push({
            email: email,
            name: name || 'Giáo viên mới',
            role: 'teacher',
            password: '123456', // Default password
            isLocked: false
        });
        this.saveAuthorizedTeachers(teachers);
        return true;
    },

    updateTeacherPassword: function (email, newPassword) {
        const teachers = this.getAuthorizedTeachers();
        const teacher = teachers.find(t => t.email.toLowerCase() === email.toLowerCase());
        if (teacher) {
            teacher.password = newPassword;
            this.saveAuthorizedTeachers(teachers);
            return true;
        }
        return false;
    },

    resetTeacherPassword: function (email, newPassword = '123456') {
        const teachers = this.getAuthorizedTeachers();
        const teacher = teachers.find(t => t.email.toLowerCase() === email.toLowerCase());
        if (teacher) {
            teacher.password = newPassword;
            this.saveAuthorizedTeachers(teachers);
            return true;
        }
        return false;
    },

    deleteAuthorizedTeacher: function (email) {
        let teachers = this.getAuthorizedTeachers();
        // Prevent deleting the main admin
        if (email === 'admin@hdu.com') return false;

        const initialLength = teachers.length;
        teachers = teachers.filter(t => t.email !== email);

        if (teachers.length < initialLength) {
            this.saveAuthorizedTeachers(teachers);
            return true;
        }
        return false;
    },

    toggleTeacherLock: function (email) {
        const teachers = this.getAuthorizedTeachers();
        const teacher = teachers.find(t => t.email === email);
        // Prevent locking main admin
        if (teacher && teacher.email !== 'admin@hdu.com') {
            teacher.isLocked = !teacher.isLocked;
            this.saveAuthorizedTeachers(teachers);
            return true;
        }
        return false;
    },

    // Data Transfer System (Global)
    getTransfers: function () {
        const transfers = localStorage.getItem('system_transfers');
        return transfers ? JSON.parse(transfers) : [];
    },

    saveTransfers: function (transfers) {
        localStorage.setItem('system_transfers', JSON.stringify(transfers));
    },

    addTransfer: function (transferData) {
        const transfers = this.getTransfers();
        transfers.push(transferData);
        this.saveTransfers(transfers);
    },

    deleteTransfer: function (transferId) {
        const transfers = this.getTransfers();
        const newTransfers = transfers.filter(t => t.id !== transferId);
        this.saveTransfers(newTransfers);
    },

    getPendingTransfersForUser: function (email) {
        if (!email) return [];
        const transfers = this.getTransfers();
        return transfers.filter(t => t.toUser === email);
    },

    // Group Management
    getGroups: function () {
        const groups = localStorage.getItem('teacher_groups');
        return groups ? JSON.parse(groups) : [];
    },

    saveGroups: function (groups) {
        localStorage.setItem('teacher_groups', JSON.stringify(groups));
    },

    addGroup: function (name, members) {
        const groups = this.getGroups();
        const id = 'group_' + Date.now();
        groups.push({ id, name, members }); // members is array of emails
        this.saveGroups(groups);
        return id;
    },

    deleteGroup: function (groupId) {
        const groups = this.getGroups();
        const newGroups = groups.filter(g => g.id !== groupId);
        this.saveGroups(newGroups);
    },

    // Messaging System
    getMessages: function () {
        const messages = localStorage.getItem('system_messages');
        return messages ? JSON.parse(messages) : [];
    },

    saveMessages: function (messages) {
        localStorage.setItem('system_messages', JSON.stringify(messages));
    },

    sendMessage: function (fromEmail, fromName, toEmail, subject, content, threadId = null) {
        const messages = this.getMessages();
        const msgId = 'msg_' + Date.now();
        const newMessage = {
            id: msgId,
            threadId: threadId || msgId,
            from: fromEmail,
            fromName: fromName,
            to: toEmail,
            subject: subject,
            content: content,
            timestamp: new Date().toISOString(),
            read: false
        };
        messages.push(newMessage);
        this.saveMessages(messages);
        return newMessage;
    },

    getMessagesForUser: function (email) {
        const lowerEmail = email.toLowerCase();
        return this.getMessages().filter(m =>
            m.to.toLowerCase() === lowerEmail || m.from.toLowerCase() === lowerEmail
        );
    },

    markMessageAsRead: function (messageId) {
        const messages = this.getMessages();
        const msg = messages.find(m => m.id === messageId);
        if (msg) {
            msg.read = true;
            this.saveMessages(messages);
        }
    },

    deleteMessage: function (messageId) {
        const messages = this.getMessages();
        const newMessages = messages.filter(m => m.id !== messageId);
        this.saveMessages(newMessages);
    },

    // Custom Comments Bank
    saveCustomComments: function (comments) {
        const key = this.getUserKey('custom_comments');
        if (key) localStorage.setItem(key, JSON.stringify(comments));
    },

    getCustomComments: function () {
        const key = this.getUserKey('custom_comments');
        if (!key) return {};
        const comments = localStorage.getItem(key);
        return comments ? JSON.parse(comments) : {};
    }
};