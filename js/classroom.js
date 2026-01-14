// Classroom Management
const Classroom = {
    currentClass: 'class1',

    loadClassroom: function (classId = null) {
        if (classId !== null) {
            this.currentClass = classId;
        } else {
            // If no classId provided (e.g. when switching tabs), get from dropdown
            const classDropdown = document.getElementById('classDropdown');
            this.currentClass = classDropdown ? classDropdown.dataset.value : '';
        }

        const students = Storage.getStudents();
        // Only filter if we have a valid classId
        const classStudents = this.currentClass ? students.filter(s => s.classId === this.currentClass) : [];

        this.renderClassroom(classStudents);
    },

    renderClassroom: function (students) {
        const grid = document.getElementById('classroomGrid');
        grid.innerHTML = '';

        // Determine context (Selected Subject)
        const schoolId = document.getElementById('schoolDropdown') ? document.getElementById('schoolDropdown').dataset.value : null;
        const subjectDropdown = document.getElementById('subjectDropdown');
        const selectedSubjectId = subjectDropdown ? subjectDropdown.dataset.value : '';
        let selectedSubjectName = null;
        if (selectedSubjectId) {
            const subjects = Storage.getSubjects(schoolId);
            const sub = subjects.find(s => s.id === selectedSubjectId);
            if (sub) selectedSubjectName = sub.name;
        }

        // Get Grid Settings (Subject Specific)
        const settings = Storage.getGridSettings(selectedSubjectId);
        this.applyGridSettings(settings);

        // Get designated display column for this subject
        const displaySettings = Storage.getDisplaySettings();
        const displayColName = selectedSubjectId ? displaySettings[selectedSubjectId] : null;

        // Create seats based on settings
        const totalSeats = settings.rows * settings.cols;
        for (let i = 0; i < totalSeats; i++) {
            // Find student at this seat for this specific subject
            const student = students.find(s => this.getStudentSeat(s, selectedSubjectId) === i);
            const seat = this.createSeatCell(i, student, selectedSubjectName, displayColName);
            grid.appendChild(seat);
        }
    },

    applyGridSettings: function (settings) {
        document.documentElement.style.setProperty('--grid-cols', settings.cols);
        document.documentElement.style.setProperty('--grid-rows', settings.rows);
        document.documentElement.style.setProperty('--grid-scale', settings.size / 100);
    },

    createSeatCell: function (index, student, subjectName = null, displayColName = null) {
        const cell = document.createElement('div');
        cell.className = 'seat-cell';
        cell.dataset.index = index;

        if (student) {
            const seat = document.createElement('div');
            seat.className = 'seat';
            seat.draggable = true;
            seat.dataset.studentId = student.id;

            const firstLetter = student.name.split(' ').pop()[0] || '?';

            let avatarColor = 'linear-gradient(135deg, #4a6fa5, #166088)';
            if (student.averageScore >= 8) {
                avatarColor = 'linear-gradient(135deg, #4fc3a1, #3aa88f)';
            } else if (student.averageScore < 6.5) {
                avatarColor = 'linear-gradient(135deg, #e74c3c, #c0392b)';
            }

            let avatarHtml;
            if (student.avatar && student.avatar.startsWith('data:image')) {
                avatarHtml = `<img src="${student.avatar}" alt="${student.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
            } else {
                avatarHtml = firstLetter;
            }

            let infoDisplay = '';
            if (subjectName) {
                const sub = student.subjects ? student.subjects.find(s => s.name === subjectName) : null;

                let score = '--';
                let label = '';

                if (displayColName && sub && sub.assessments) {
                    const assessment = sub.assessments.find(a => a.name === displayColName);
                    score = assessment && assessment.score !== null ? assessment.score : '--';
                    label = displayColName;
                } else {
                    score = sub && sub.score !== null ? sub.score : '--';
                }

                if (score !== '--') {
                    let scoreClass = 'normal';
                    if (score >= 8) scoreClass = 'good';
                    else if (score < 5) scoreClass = 'poor';

                    infoDisplay = `<div class="seat-score ${scoreClass}" title="${label}">${score}</div>`;
                }
            }

            const avgScore = student.averageScore || 0;
            const conductScore = student.conduct || 0;

            // Determine what to show in the primary label (TB or Specific Column)
            let displayLabel = 'TB';
            let displayValue = avgScore.toFixed(1);
            let scoreClass = 'normal';

            if (subjectName) {
                const sub = student.subjects ? student.subjects.find(s => s.name === subjectName) : null;
                if (sub && displayColName) {
                    const assessment = sub.assessments ? sub.assessments.find(a => a.name === displayColName) : null;
                    if (assessment && assessment.score !== null) {
                        displayLabel = displayColName;
                        displayValue = assessment.score;
                    } else {
                        displayValue = '0.0';
                    }
                } else {
                    displayValue = '0.0';
                }
            }

            if (parseFloat(displayValue) >= 8) scoreClass = 'good';
            else if (parseFloat(displayValue) < 5) scoreClass = 'poor';

            // Progress bars and colors (Always Green as requested)
            let barWidth = avgScore * 10;
            let barColor = 'var(--accent-color)';

            if (subjectName) {
                barWidth = parseFloat(displayValue) * 10;
            }

            const statsBars = `
                <div class="seat-stats">
                    <div class="seat-avg-label ${scoreClass}">
                        ${displayLabel}: ${displayValue}
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Điểm</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar academic" style="width: ${barWidth}%; background: ${barColor};"></div>
                        </div>
                    </div>
                    <div class="stat-row">
                        <span class="stat-label">Ý thức</span>
                        <div class="stat-bar-container">
                            <div class="stat-bar conduct" style="width: ${conductScore * 10}%"></div>
                        </div>
                    </div>
                </div>
            `;

            seat.innerHTML = `
                <div class="delete-btn" title="Xóa học sinh">&times;</div>
                <div class="edit-btn" title="Sửa thông tin"><i class="fas fa-edit"></i></div>
                <div class="seat-avatar" style="background: ${avatarColor}">
                    ${avatarHtml}
                </div>
                <div class="seat-name">${student.name}</div>
                ${statsBars}
            `;

            // Drag Events
            seat.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', student.id);
                seat.classList.add('dragging');
            });

            seat.addEventListener('dragend', () => {
                seat.classList.remove('dragging');
            });

            seat.addEventListener('click', (e) => {
                if (e.target.closest('.delete-btn') || e.target.closest('.edit-btn')) return;
                viewStudentDetails(student.id);
            });

            // Action buttons
            seat.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteStudent(student.id);
            });

            seat.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                editStudent(student.id);
            });

            cell.appendChild(seat);
        } else {
            // Empty Cell
            cell.innerHTML = `
                <div class="seat-placeholder">
                    <span>${index + 1}</span>
                    <i class="fas fa-plus"></i>
                </div>
            `;
            cell.addEventListener('click', () => {
                // Open add modal and pre-fill seat index
                document.getElementById('addStudentForm').reset();
                document.getElementById('editStudentId').value = '';
                document.getElementById('saveStudentBtn').textContent = 'Thêm học sinh';
                document.getElementById('avatarPreview').innerHTML = '<i class="fas fa-user"></i>';
                document.querySelector('#addStudentModal h3').textContent = 'Thêm học sinh mới';

                // We'll need a way to pass the seat index to the save handler
                // For now, let's just use a global or data attribute on the modal
                document.getElementById('addStudentModal').dataset.targetSeat = index;

                openModal('addStudentModal');
            });
        }

        // Drop handling on cell
        cell.addEventListener('dragover', (e) => {
            e.preventDefault();
            cell.classList.add('drag-over');
        });

        cell.addEventListener('dragleave', () => {
            cell.classList.remove('drag-over');
        });

        cell.addEventListener('drop', (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            const studentId = e.dataTransfer.getData('text/plain');
            this.assignSeat(studentId, index);
        });

        return cell;
    },

    getStudentSeat: function (student, subjectId) {
        if (!student) return -1;
        if (!subjectId) return parseInt(student.seat);
        if (!student.seatPositions) student.seatPositions = {};
        if (student.seatPositions[subjectId] !== undefined && student.seatPositions[subjectId] !== null) {
            return parseInt(student.seatPositions[subjectId]);
        }
        return parseInt(student.seat);
    },

    setStudentSeat: function (student, seatPosition, subjectId) {
        if (!student) return;
        if (!subjectId) {
            student.seat = seatPosition;
        } else {
            if (!student.seatPositions) student.seatPositions = {};
            student.seatPositions[subjectId] = seatPosition;
        }
    },

    assignSeat: function (studentId, seatPosition) {
        const students = Storage.getStudents();
        const subjectDropdown = document.getElementById('subjectDropdown');
        const subjectId = subjectDropdown ? subjectDropdown.dataset.value : '';

        const existingStudentAtSeat = students.find(s =>
            this.getStudentSeat(s, subjectId) == seatPosition &&
            s.classId === this.currentClass
        );

        const draggedStudent = students.find(s => s.id === studentId);
        if (!draggedStudent) return false;

        if (existingStudentAtSeat && existingStudentAtSeat.id !== studentId) {
            const draggedOriginalSeat = this.getStudentSeat(draggedStudent, subjectId);
            this.setStudentSeat(existingStudentAtSeat, draggedOriginalSeat, subjectId);
        }

        this.setStudentSeat(draggedStudent, seatPosition, subjectId);

        Storage.saveStudents(students);
        this.loadClassroom();
        showToast(`Đã cập nhật vị trí`);
        return true;
    }
};
