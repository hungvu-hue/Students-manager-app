// Grades Management logic
const Grades = {
    currentColumns: [],
    draggedColIndex: null,

    loadGrades: function () {
        const classId = document.getElementById('classDropdown').dataset.value;
        const subjectId = document.getElementById('subjectDropdown').dataset.value;

        if (!classId) {
            this.renderEmptyState('Vui lòng chọn lớp học');
            return;
        }

        // Load Formulas
        const allFormulas = Storage.getFormulas();
        this.currentSubjectId = subjectId;
        this.formulas = allFormulas[subjectId] || {};

        const students = Storage.getStudents();
        const classStudents = students.filter(s => s.classId === classId);

        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        const subjects = Storage.getSubjects(schoolId);

        const currentSubject = subjectId ? subjects.find(s => s.id === subjectId) : null;
        const subjectName = currentSubject ? currentSubject.name : null;

        // Reset columns if subject or class changed
        if (this.lastSubjectId !== subjectId || this.lastClassId !== classId) {
            this.currentColumns = [];
            this.lastSubjectId = subjectId;
            this.lastClassId = classId;
        }

        // Only try to sync columns from student data if we have a subject and no current columns
        if (subjectName && this.currentColumns.length === 0) {
            if (classStudents.length > 0) {
                // Find first student with this subject to get column structure
                const studentWithSubject = classStudents.find(s =>
                    s.subjects && s.subjects.find(sub => sub.name === subjectName && sub.assessments && sub.assessments.length > 0)
                );

                if (studentWithSubject) {
                    const sub = studentWithSubject.subjects.find(s => s.name === subjectName);
                    this.currentColumns = sub.assessments.map(a => a.name);
                }
            }
        } else if (!subjectName) {
            this.currentColumns = [];
        }

        this.renderTable(classStudents, subjectName);
    },

    renderEmptyState: function (message) {
        const tbody = document.getElementById('gradesTableBody');
        const header = document.getElementById('gradesTableHeader');
        header.innerHTML = `
            <th class="sticky-left" style="left: 0; width: 50px; min-width: 50px; text-align: center;">STT</th>
            <th class="sticky-left" style="left: 50px; width: 250px; min-width: 250px;">Họ và tên</th>
            <th class="sticky-left" style="left: 300px; width: 120px; min-width: 120px; text-align: center;">Ngày sinh</th>
            <th class="sticky-left" style="left: 420px; width: 100px; min-width: 100px; text-align: center;">Giới tính</th>
        `;
        tbody.innerHTML = `<tr><td colspan="20" style="text-align: center; padding: 2rem; color: #999;">${message}</td></tr>`;
    },

    renderTable: function (students, subjectName) {
        const header = document.getElementById('gradesTableHeader');
        const tbody = document.getElementById('gradesTableBody');

        // Determine columns
        let columns = [];
        if (subjectName) {
            columns = [...this.currentColumns]; // Use current state
        } else {
            columns = [];
        }
        this.currentColumns = columns;

        // Render Header
        header.innerHTML = `
            <th class="sticky-left" style="left: 0; width: 50px; min-width: 50px; z-index: 120 !important; background-color: #f8f9fa; text-align: center;">STT</th>
            <th class="sticky-left" style="left: 50px; width: 250px; min-width: 250px; z-index: 120 !important; background-color: #f8f9fa;">Họ và tên</th>
            <th class="sticky-left" style="left: 300px; width: 120px; min-width: 120px; z-index: 120 !important; background-color: #f8f9fa; text-align: center;">Ngày sinh</th>
            <th class="sticky-left" style="left: 420px; width: 100px; min-width: 100px; z-index: 120 !important; background-color: #f8f9fa; text-align: center;">Giới tính</th>
        `;

        const displaySettings = Storage.getDisplaySettings();
        const designatedCol = displaySettings[this.currentSubjectId];

        columns.forEach((colName, index) => {
            const th = document.createElement('th');
            // Allow flexible width but enforce minimum
            th.style.minWidth = '80px';
            th.style.width = 'auto';
            th.style.whiteSpace = 'nowrap';
            th.style.cursor = 'grab';

            // Drag and Drop Attributes
            th.draggable = true;
            th.ondragstart = (e) => Grades.handleDragStart(e, index);
            th.ondragover = (e) => Grades.handleDragOver(e);
            th.ondragleave = (e) => Grades.handleDragLeave(e);
            th.ondrop = (e) => Grades.handleDrop(e, index);
            th.ondragend = (e) => Grades.handleDragEnd(e);

            // Adjust input style to be auto/flexible
            th.innerHTML = `
                <div class="col-header-container" style="padding: 0 4px;">
                    <div style="display: flex; align-items: center; width: 100%; gap: 4px;">
                         <input type="text" class="editable-header" value="${colName}" 
                            onchange="Grades.updateColumnName(${index}, this.value)"
                            style="flex: 1; min-width: 40px; font-size: 0.8rem; padding: 2px; text-align: center;">
                         <span class="formula-btn" title="Thiết lập công thức" onclick="Grades.openFormulaModal(${index})" 
                               style="font-family: serif; font-style: italic; font-weight: bold; font-size: 1rem; color: #4a6fa5; cursor: pointer; padding: 0 4px;">fx</span>
                         <i class="fas fa-map-marker-alt" 
                            title="${colName === designatedCol ? 'Tắt hiển thị trên sơ đồ' : 'Hiển thị trên sơ đồ'}" 
                            onclick="Grades.toggleDisplayOnMap('${colName}')"
                            style="font-size: 0.8rem; cursor: pointer; transition: all 0.2s; color: ${colName === designatedCol ? '#27ae60' : '#ccc'};">
                         </i>
                         <i class="fas fa-times delete-col-btn" title="Xóa cột" onclick="Grades.deleteColumn(${index})" 
                            style="font-size: 0.7rem; color: #e74c3c; cursor: pointer; opacity: 0.6;"></i>
                    </div>
                </div>
            `;
            header.appendChild(th);
        });

        // Render Body
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${4 + columns.length}" style="text-align: center; padding: 2rem; color: #999;">Chưa có học sinh trong lớp này</td></tr>`;
            return;
        }

        students.forEach((student, sIndex) => {
            const row = document.createElement('tr');
            row.dataset.studentId = student.id;

            // Format date correctly
            let dobDisplay = student.dob;
            if (dobDisplay && dobDisplay.includes('-')) {
                const parts = dobDisplay.split('-');
                if (parts.length === 3) dobDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            row.innerHTML = `
                <td class="sticky-left" style="left: 0; width: 50px; min-width: 50px; background-color: #fff; text-align: center;">${sIndex + 1}</td>
                <td class="sticky-left" style="left: 50px; width: 250px; min-width: 250px; background-color: #fff; font-weight: 500;">${student.name}</td>
                <td class="sticky-left" style="left: 300px; width: 120px; min-width: 120px; background-color: #fff; text-align: center;">${dobDisplay}</td>
                <td class="sticky-left" style="left: 420px; width: 100px; min-width: 100px; background-color: #fff; text-align: center;">${student.gender}</td>
            `;

            if (subjectName) {
                const sub = student.subjects ? student.subjects.find(s => s.name === subjectName) : null;

                columns.forEach((colName, cIndex) => {
                    const td = document.createElement('td');
                    // flexible width
                    td.style.minWidth = '80px';
                    td.style.padding = '5px';
                    td.style.textAlign = 'center';

                    let score = '';
                    if (sub && sub.assessments) {
                        const assessment = sub.assessments.find(a => a.name === colName);
                        score = assessment ? (assessment.score !== null ? assessment.score : '') : '';
                    } else if (sub && sub.score !== null && colName === 'Học kỳ') {
                        score = sub.score;
                    }

                    // Revert to input for typing
                    td.innerHTML = `
                        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 100%;">
                            <input type="number" step="0.1" min="0" max="10" class="grade-input" 
                                value="${score}" 
                                style="width: 100%; text-align: center; border: 1px solid transparent; background: transparent; font-weight: 500;"
                                onfocus="this.style.borderColor='var(--primary-color)'; this.style.background='#fff'"
                                onblur="this.style.borderColor='transparent'; this.style.background='transparent'"
                                onchange="Grades.onScoreChange('${student.id}', '${subjectName}', '${colName}', this.value)">
                            <i class="fas fa-exclamation-circle formula-warning" title="Dữ liệu chưa đầy đủ cho công thức" 
                               style="position: absolute; right: 2px; color: #f39c12; font-size: 0.7rem; cursor: help; display: none;"></i>
                        </div>`;
                    row.appendChild(td);
                });
            }
            tbody.appendChild(row);
        });

        // Update chart if visible
        const chartSection = document.getElementById('gradesChartSection');
        if (chartSection && chartSection.style.display !== 'none') {
            if (subjectName) {
                this.renderChart();
            } else {
                chartSection.style.display = 'none';
            }
        }
    },

    updateColumnName: function (index, newName) {
        this.currentColumns[index] = newName;
        // Logic will be saved when "Save" is clicked
    },

    deleteColumn: function (index) {
        const subjectId = document.getElementById('subjectDropdown').dataset.value;
        if (!subjectId) return;

        if (confirm('Bạn có chắc muốn xóa cột điểm này?')) {
            this.currentColumns.splice(index, 1);
            this.saveAll();
        }
    },

    addColumn: function () {
        const subjectId = document.getElementById('subjectDropdown').dataset.value;
        if (!subjectId) {
            alert('Vui lòng chọn môn học để thêm cột điểm.');
            return;
        }

        const modal = document.getElementById('addGradeColModal');
        const form = document.getElementById('addGradeColForm');
        form.reset();

        form.onsubmit = (e) => {
            e.preventDefault();
            const name = document.getElementById('newGradeColName').value.trim();

            if (name) {
                this.currentColumns.push(name);
                this.loadGrades();
                if (modal) modal.classList.remove('active');
            }
        };

        if (typeof openModal === 'function') openModal('addGradeColModal');
        else if (modal) modal.classList.add('active');
    },

    openFormulaModal: function (colIndex) {
        const colName = this.currentColumns[colIndex];
        const modal = document.getElementById('formulaModal');

        // Set labels
        document.getElementById('formulaTargetCol').textContent = colName;
        document.getElementById('formulaInput').value = this.formulas[colName] || '';

        // Generate column tags (buttons)
        const tagsContainer = document.getElementById('formulaColumnTags');
        tagsContainer.innerHTML = '';

        this.currentColumns.forEach((col, idx) => {
            if (idx !== colIndex) { // Don't allow self-reference loop easily
                const tag = document.createElement('button');
                tag.className = 'btn-secondary';
                tag.style.padding = '2px 8px';
                tag.style.fontSize = '0.8rem';
                tag.textContent = col;
                tag.onclick = () => {
                    const input = document.getElementById('formulaInput');
                    // Insert at cursor position or end
                    const val = input.value;
                    input.value = val + (val.length > 0 && !val.endsWith(' ') ? ' ' : '') + col;
                    input.focus();
                };
                tagsContainer.appendChild(tag);
            }
        });

        // Setup Apply Button
        const applyBtn = document.getElementById('applyFormulaBtn');
        applyBtn.onclick = () => {
            const formula = document.getElementById('formulaInput').value;
            if (formula) {
                this.executeFormula(colIndex, formula);
                if (modal) modal.classList.remove('active');
            } else {
                alert('Vui lòng nhập công thức');
            }
        };

        // Open modal using global function if available or manual class
        if (typeof openModal === 'function') openModal('formulaModal');
        else if (modal) modal.classList.add('active');
    },

    executeFormula: function (targetColIndex, formula) {
        const targetColName = this.currentColumns[targetColIndex];
        const tbody = document.getElementById('gradesTableBody');
        const rows = tbody.querySelectorAll('tr[data-student-id]');

        rows.forEach(row => {
            this.applyFormulaToRow(row, targetColIndex, formula);
        });

        // Save formula
        const allFormulas = Storage.getFormulas();
        if (!allFormulas[this.currentSubjectId]) allFormulas[this.currentSubjectId] = {};
        allFormulas[this.currentSubjectId][targetColName] = formula;
        Storage.saveFormulas(allFormulas);
        this.formulas = allFormulas[this.currentSubjectId];

        showToast(`Đã áp dụng công thức cho cột ${targetColName}`);
    },

    applyFormulaToRow: function (row, targetColIndex, formula) {
        const inputs = row.querySelectorAll('.grade-input');
        const warnings = row.querySelectorAll('.formula-warning');

        // Identify which columns are actually used in this formula
        const usedCols = this.currentColumns.filter(col => formula.includes(col));

        // Map column names to values for this student and track emptiness
        let emptyCount = 0;
        let valuedCount = 0;
        const valueMap = {};

        this.currentColumns.forEach((colName, idx) => {
            const valStr = inputs[idx].value.trim();
            const isUsed = usedCols.includes(colName);

            if (valStr === '') {
                if (isUsed) emptyCount++;
                valueMap[colName] = 0;
            } else {
                if (isUsed) valuedCount++;
                valueMap[colName] = parseFloat(valStr);
            }
        });

        const targetInput = inputs[targetColIndex];
        const targetWarning = warnings[targetColIndex];

        // Logic:
        // 1. If ALL used columns are empty -> set to blank
        if (valuedCount === 0 && usedCols.length > 0) {
            targetInput.value = '';
            if (targetWarning) targetWarning.style.display = 'none';
            return;
        }

        try {
            // Prepare formula: replace column names with values
            let processedFormula = formula;
            const sortedCols = [...this.currentColumns].sort((a, b) => b.length - a.length);

            sortedCols.forEach(colName => {
                // Use a safer replacement method
                processedFormula = processedFormula.split(colName).join(valueMap[colName]);
            });

            const safeFormula = processedFormula.replace(/[^0-9. +\-*/()]/g, '');
            const result = eval(safeFormula);

            if (!isNaN(result)) {
                const finalScore = Math.round(result * 10) / 10;
                targetInput.value = finalScore;

                // Show warning if some are empty and some have values
                if (emptyCount > 0 && valuedCount > 0) {
                    if (targetWarning) targetWarning.style.display = 'block';
                } else {
                    if (targetWarning) targetWarning.style.display = 'none';
                }

                // Visual feedback
                targetInput.style.backgroundColor = '#e8f5e9';
                setTimeout(() => targetInput.style.backgroundColor = 'transparent', 500);
            }
        } catch (e) {
            console.error("Formula evaluation error:", e);
        }
    },

    handleGradeClick: function (element, studentId, subjectName, colName) {
        let currentText = element.innerText.trim();
        let currentVal = currentText === '' ? 0 : parseFloat(currentText);

        // Cycle 0 -> 10 -> 0 or just increment?
        // "Mỗi lần ấn tăng 1 đơn vị"
        let newVal = currentVal + 1;
        if (newVal > 10) newVal = 0; // Reset loop if > 10

        element.innerText = newVal;
        // Optionally trigger save or visual feedback
        element.style.backgroundColor = '#e8f0fe';
        setTimeout(() => element.style.backgroundColor = 'transparent', 200);
    },

    onScoreChange: function (studentId, subjectName, colName, value) {
        // Find row
        const tbody = document.getElementById('gradesTableBody');
        const row = tbody.querySelector(`tr[data-student-id="${studentId}"]`);
        if (!row) return;

        // Recalculate all formulas for this row
        this.currentColumns.forEach((name, idx) => {
            if (this.formulas[name]) {
                this.applyFormulaToRow(row, idx, this.formulas[name]);
            }
        });
    },

    // Drag and Drop Handlers
    handleDragStart: function (e, index) {
        this.draggedColIndex = index;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', index);
        e.target.closest('th').classList.add('grade-th-dragging');
    },

    handleDragOver: function (e) {
        if (e.preventDefault) {
            e.preventDefault(); // Necessary. Allows us to drop.
        }
        e.dataTransfer.dropEffect = 'move';
        const th = e.target.closest('th');
        if (th) th.classList.add('grade-th-drag-over');
        return false;
    },

    handleDragLeave: function (e) {
        const th = e.target.closest('th');
        if (th) th.classList.remove('grade-th-drag-over');
    },

    handleDragEnd: function (e) {
        const ths = document.querySelectorAll('#gradesTableHeader th');
        ths.forEach(th => {
            th.classList.remove('grade-th-dragging');
            th.classList.remove('grade-th-drag-over');
        });
        this.draggedColIndex = null;
    },

    handleDrop: function (e, targetIndex) {
        if (e.stopPropagation) {
            e.stopPropagation(); // stops the browser from redirecting.
        }

        const th = e.target.closest('th');
        if (th) th.classList.remove('grade-th-drag-over');

        if (this.draggedColIndex !== null && this.draggedColIndex !== targetIndex) {
            this.reorderColumns(this.draggedColIndex, targetIndex);
        }
        return false;
    },

    reorderColumns: function (fromIndex, toIndex) {
        // 1. Sync current DOM inputs to Storage using OLD order
        this.saveAll(true);

        // 2. Reorder internal column array
        const element = this.currentColumns.splice(fromIndex, 1)[0];
        this.currentColumns.splice(toIndex, 0, element);

        // 3. Re-render the view (which will use the new column order and fetch correctly mapped data)
        this.loadGrades();

        // 4. Sync Storage again to ensure student.assessments array matches new visual order
        this.saveAll(true);
    },

    saveAll: function (silent = false) {
        const students = Storage.getStudents();
        const classId = document.getElementById('classDropdown').dataset.value;
        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        const subjectId = document.getElementById('subjectDropdown').dataset.value;

        if (!subjectId) {
            alert("Vui lòng chọn môn học để lưu điểm.");
            return;
        }

        const subjects = Storage.getSubjects(schoolId);
        const currentSubject = subjects.find(s => s.id === subjectId);
        if (!currentSubject) return;
        const subjectName = currentSubject.name;

        const tbody = document.getElementById('gradesTableBody');

        // Simple way: iterate students and grab values from DOM using IDs
        students.forEach(student => {
            if (student.classId === classId) {
                const row = tbody.querySelector(`tr[data-student-id="${student.id}"]`);
                if (!row) return;

                if (!student.subjects) student.subjects = [];
                let sub = student.subjects.find(s => s.name === subjectName);
                if (!sub) {
                    sub = { name: subjectName, score: null, assessments: [] };
                    student.subjects.push(sub);
                }

                const inputs = row.querySelectorAll('.grade-input');
                sub.assessments = this.currentColumns.map((colName, idx) => {
                    const input = inputs[idx];
                    const val = input ? input.value : '';
                    return {
                        name: colName,
                        score: val === '' ? null : parseFloat(val)
                    };
                });

                // Update legacy average/score if needed
                const scores = sub.assessments.filter(a => a.score !== null).map(a => a.score);
                if (scores.length > 0) {
                    sub.score = scores.reduce((a, b) => a + b, 0) / scores.length;
                    sub.score = Math.round(sub.score * 10) / 10;
                } else {
                    sub.score = 0; // Default to 0 instead of null
                }
            }
        });

        // Recalculate averageScore for classroom view
        students.forEach(student => {
            if (student.subjects && student.subjects.length > 0) {
                const validScores = student.subjects.filter(s => s.score !== null).map(s => s.score);
                if (validScores.length > 0) {
                    student.averageScore = validScores.reduce((a, b) => a + b, 0) / validScores.length;
                } else {
                    student.averageScore = 0;
                }
            }
        });

        Storage.saveStudents(students);
        if (!silent) showToast('Đã lưu bảng điểm thành công');
        this.loadGrades();
    },

    toggleDisplayOnMap: function (colName) {
        const displaySettings = Storage.getDisplaySettings() || {};
        const currentDesignated = displaySettings[this.currentSubjectId];

        if (currentDesignated === colName) {
            // Toggle off
            delete displaySettings[this.currentSubjectId];
            showToast(`Đã tắt hiển thị cột ${colName} trên sơ đồ`);
        } else {
            // Toggle on (replace)
            displaySettings[this.currentSubjectId] = colName;
            showToast(`Đã chọn hiển thị cột ${colName} trên sơ đồ`);
        }

        Storage.saveDisplaySettings(displaySettings);
        this.loadGrades(); // Refresh table headers
        if (typeof Classroom !== 'undefined') {
            Classroom.loadClassroom(); // Pre-render map with new settings
        }
    },

    toggleChart: function () {
        const section = document.getElementById('gradesChartSection');
        const btn = document.getElementById('showGradesChartBtn');

        if (section.style.display === 'none' || !section.style.display) {
            // Force display first
            section.style.display = 'block';

            // Give enough time for the browser to render the block and calculate new height
            setTimeout(() => {
                this.renderChart();

                // Final check to make sure everything is visible
                requestAnimationFrame(() => {
                    // Force a layout recalculation
                    window.dispatchEvent(new Event('resize'));

                    // Manual scroll calculation with an offset
                    const yOffset = -20;
                    const elementPos = section.getBoundingClientRect().top + window.pageYOffset;

                    window.scrollTo({
                        top: elementPos + yOffset,
                        behavior: 'smooth'
                    });
                });

                if (btn) {
                    btn.classList.add('active-stat-btn');
                    btn.style.backgroundColor = 'var(--primary-color)';
                    btn.style.color = 'white';
                }
            }, 200);
        } else {
            section.style.display = 'none';
            if (btn) {
                btn.classList.remove('active-stat-btn');
                btn.style.backgroundColor = '';
                btn.style.color = '';
            }
        }
    },

    renderChart: function () {
        const classId = document.getElementById('classDropdown').dataset.value;
        const subjectId = document.getElementById('subjectDropdown').dataset.value;
        if (!classId || !subjectId) return;

        const students = Storage.getStudents();
        const filteredStudents = students.filter(s => s.classId === classId);

        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        const subjects = Storage.getSubjects(schoolId);
        const currentSubject = subjects.find(s => s.id === subjectId);
        if (!currentSubject) return;
        const subjectName = currentSubject.name;

        // Determine which scores to use. Use designated column if available, else average.
        const displaySettings = Storage.getDisplaySettings();
        const designatedCol = displaySettings[subjectId];

        const studentScores = [];
        filteredStudents.forEach(student => {
            const sub = student.subjects ? student.subjects.find(s => s.name === subjectName) : null;
            if (!sub) return;

            let score = null;
            if (designatedCol) {
                const assessment = sub.assessments ? sub.assessments.find(a => a.name === designatedCol) : null;
                if (assessment && assessment.score !== null) {
                    score = assessment.score;
                }
            } else if (sub.score !== null) {
                score = sub.score;
            }

            if (score !== null) {
                studentScores.push({ name: student.name, score: score });
            }
        });

        const scores = studentScores.map(ss => ss.score);

        // Group scores into ranges: 0-3, 3-5, 5-6.5, 6.5-8, 8-10
        const ranges = {
            'Kém (0-3)': 0,
            'Yếu (3-5)': 0,
            'Trung bình (5-6.5)': 0,
            'Khá (6.5-8)': 0,
            'Giỏi (8-10)': 0
        };

        scores.forEach(s => {
            if (s < 3) ranges['Kém (0-3)']++;
            else if (s < 5) ranges['Yếu (3-5)']++;
            else if (s < 6.5) ranges['Trung bình (5-6.5)']++;
            else if (s < 8) ranges['Khá (6.5-8)']++;
            else ranges['Giỏi (8-10)']++;
        });

        // Update Chart Title with Subject Name
        const chartTitle = document.getElementById('gradesChartTitle');
        if (chartTitle) {
            chartTitle.innerHTML = `<i class="fas fa-chart-column"></i> Phân tích phổ điểm - Môn: ${subjectName}`;
        }

        const ctx = document.getElementById('gradesBarChart').getContext('2d');

        // Destroy existing chart if it exists
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        this.currentChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(ranges),
                datasets: [{
                    label: `Phổ điểm: ${designatedCol || 'TB Môn'}`,
                    data: Object.values(ranges),
                    backgroundColor: [
                        '#e74c3c', // Kém (Red)
                        '#e67e22', // Yếu (Orange)
                        '#f1c40f', // Trung bình (Yellow)
                        '#3498db', // Khá (Blue)
                        '#2ecc71'  // Giỏi (Green)
                    ],
                    borderRadius: 6,
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Số lượng: ${context.raw} học sinh`
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });

        // Trigger AI Commentary
        this.generateAICommentary(ranges, subjectName, filteredStudents.length, studentScores);
    },

    generateAICommentary: function (ranges, subjectName, studentCount, studentScores) {
        const container = document.getElementById('aiCommentaryText');
        if (!container) return;

        if (studentCount === 0) {
            container.textContent = "Chưa có dữ liệu để phân tích.";
            return;
        }

        const kem = ranges['Kém (0-3)'] || 0;
        const yeu = ranges['Yếu (3-5)'] || 0;
        const tb = ranges['Trung bình (5-6.5)'] || 0;
        const kha = ranges['Khá (6.5-8)'] || 0;
        const gioi = ranges['Giỏi (8-10)'] || 0;

        const gioiPct = ((gioi / studentCount) * 100).toFixed(1);
        const khaPct = ((kha / studentCount) * 100).toFixed(1);
        const passPct = (((studentCount - kem - yeu) / studentCount) * 100).toFixed(1);

        let overview = "";
        let focusGroup = "";
        let solutions = "";

        // 1. Phân tích tổng quan
        if (parseFloat(passPct) >= 90) {
            overview = `Lớp có kết quả học tập môn ${subjectName} rất ấn tượng với tỉ lệ đạt trên trung bình là ${passPct}%. `;
            if (parseFloat(gioiPct) > 30) overview += "Số lượng học sinh giỏi chiếm tỉ trọng lớn, cho thấy lớp có nền tảng kiến thức vững chắc và tinh thần tự giác cao.";
            else overview += "Đa số học sinh nắm được kiến thức cơ bản, tuy nhiên cần bồi dưỡng thêm để tăng tỉ lệ học sinh xuất sắc.";
        } else if (parseFloat(passPct) >= 70) {
            overview = `Kết quả học tập môn ${subjectName} ở mức khá và ổn định. Tỉ lệ đạt yêu cầu là ${passPct}%. Nhìn chung học sinh có cố gắng nhưng mức độ đồng đều chưa cao.`;
        } else {
            overview = `Tình hình học tập môn ${subjectName} hiện đang gặp nhiều khó khăn. Tỉ lệ học sinh dưới trung bình còn cao (${(100 - parseFloat(passPct)).toFixed(1)}%). Cần có sự can thiệp và hỗ trợ kịp thời để cải thiện chất lượng.`;
        }

        // 2. Nhóm đối tượng
        const goodStudents = studentScores.filter(s => s.score >= 8).map(s => s.name);
        const poorStudents = studentScores.filter(s => s.score < 5).map(s => s.name);

        if (kem + yeu > 0) {
            focusGroup = `Cần lưu ý đặc biệt đến nhóm ${kem + yeu} học sinh (chiếm ${((kem + yeu) / studentCount * 100).toFixed(1)}%) có kết quả chưa đạt.
            Học sinh cần cải thiện: ${poorStudents.length > 0 ? poorStudents.join(", ") : "Không có học sinh ở mức kém nhưng có học sinh ở mức yếu"}.
            Cần được kiểm tra để xác định lỗ hổng kiến thức ngay lập tức.`;
        } else {
            focusGroup = "Lớp không có học sinh yếu kém. Trọng tâm nên chuyển sang việc mở rộng kiến thức và đào sâu các chủ đề khó cho nhóm học sinh Khá/Giỏi.";
        }

        const excellentInfo = goodStudents.length > 0
            ? `\n\n[HỌC SINH TIÊU BIỂU]\nCác học sinh có thành tích tốt: ${goodStudents.join(", ")}. Cần phát huy và khuyến khích để làm gương cho lớp.`
            : "";

        // 3. Giải pháp đề xuất
        const solutionPool = [
            "Tổ chức mô hình 'Đôi bạn cùng tiến', sắp xếp học sinh Giỏi hỗ trợ trực tiếp các bạn còn yếu.",
            "Tăng cường bài tập luyện tập phù hợp với từng nhóm trình độ (Differentiated Instruction).",
            "Dành thời gian phụ đạo riêng cho nhóm học sinh hổng kiến thức căn bản vào cuối buổi hoặc các tiết tự chọn.",
            "Đổi mới phương pháp giảng dạy bằng các hoạt động trực quan hoặc trò chơi học tập để tăng hứng thú.",
            "Trao đổi trực tiếp với phụ huynh của nhóm học sinh yếu để phối hợp đôn đốc việc học tại nhà."
        ];

        // Pick solutions based on stats
        let picks = [];
        if (kem + yeu > 0) {
            picks.push(solutionPool[0]);
            picks.push(solutionPool[4]);
            picks.push(solutionPool[2]);
        } else {
            picks.push(solutionPool[1]);
            picks.push(solutionPool[3]);
            picks.push("Thiết kế thêm các bài tập nâng cao hoặc dự án thực tế để kích thích tư duy sáng tạo của học sinh khá giỏi.");
        }
        solutions = picks.map((s, i) => `${i + 1}. ${s}`).join("\n");

        container.textContent = `[PHÂN TÍCH TỔNG QUAN]\n${overview}\n\n[ĐỐI TƯỢNG CẦN CHÚ Ý]\n${focusGroup}${excellentInfo}\n\n[KIẾN NGHỊ SƯ PHẠM]\n${solutions}\n\n(Dữ liệu được phân tích tự động dựa trên phổ điểm hiện tại)`;
    },

    exportExcel: function (mode) {
        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        if (!schoolId) {
            showToast('Vui lòng chọn trường học');
            return;
        }

        const subjectId = document.getElementById('subjectDropdown').dataset.value;
        const schoolName = document.getElementById('currentSchoolName').textContent;
        const subjects = Storage.getSubjects(schoolId);
        const subjectObj = subjects.find(s => s.id === subjectId);
        const subjectName = subjectObj ? subjectObj.name : 'Môn học';

        const workbook = XLSX.utils.book_new();

        const currentClassId = document.getElementById('classDropdown').dataset.value;
        const classes = Storage.getClasses(schoolId);
        const allStudents = Storage.getStudents();

        if (mode === 'current') {
            const classId = document.getElementById('classDropdown').dataset.value;
            const className = document.getElementById('currentClassName').textContent;

            if (!classId || !subjectId) {
                showToast('Vui lòng chọn lớp và môn học');
                return;
            }

            const ws = this.createGradesWorksheet(classId, className, schoolName, subjectName, allStudents);
            if (ws) {
                XLSX.utils.book_append_sheet(workbook, ws, className.substring(0, 31));
                const fileName = `Bảng điểm_${className}_${schoolName}_${subjectName}`.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
                XLSX.writeFile(workbook, `${fileName}.xlsx`);
                showToast(`Đã xuất bảng điểm lớp ${className}`);
            } else {
                showToast('Lớp học này chưa có học sinh');
            }
        } else if (mode === 'all') {
            if (!subjectId) {
                showToast('Vui lòng chọn môn học');
                return;
            }

            if (classes.length === 0) {
                showToast('Không có lớp học nào trong trường này');
                return;
            }

            let addedSheets = 0;
            classes.forEach(cls => {
                const ws = this.createGradesWorksheet(cls.id, cls.name, schoolName, subjectName, allStudents);
                if (ws) {
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
                const fileName = `Bảng điểm_Tất cả lớp_${schoolName}_${subjectName}`.replace(/[\/\\?%*:|"<>]/g, '_').replace(/\s+/g, '_');
                XLSX.writeFile(workbook, `${fileName}.xlsx`);
                showToast(`Đã xuất bảng điểm ${addedSheets} lớp học`);
            } else {
                showToast('Không có dữ liệu học sinh để xuất');
            }
        }
    },

    createGradesWorksheet: function (classId, className, schoolName, subjectName, allStudents) {
        const students = allStudents.filter(s => s.classId === classId);
        if (students.length === 0) return null;

        // Header Metadata
        const headerMetadata = [
            ['BẢNG ĐIỂM CHI TIẾT'],
            [`Trường: ${schoolName}`],
            [`Lớp: ${className} - Môn: ${subjectName}`],
            [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
            []
        ];

        // Identify columns ONLY for this specific class
        let classColumns = [];
        students.forEach(s => {
            const sub = s.subjects?.find(si => si.name === subjectName);
            if (sub && sub.assessments) {
                sub.assessments.forEach(a => {
                    if (!classColumns.includes(a.name)) {
                        classColumns.push(a.name);
                    }
                });
            }
        });

        // Fallback: If this class has NO data but it's the current class in UI, use UI columns
        const currentSelectedClassId = document.getElementById('classDropdown').dataset.value;
        if (classColumns.length === 0 && classId === currentSelectedClassId) {
            classColumns = [...this.currentColumns];
        }

        const columns = classColumns;

        // Table Header
        const tableHeader = ['STT', 'Họ và Tên', 'Ngày sinh', 'Giới tính', ...columns];

        // Table Body
        const tableBody = students.map((s, i) => {
            const row = [
                i + 1,
                s.name,
                s.dob || '',
                s.gender || ''
            ];

            const sub = s.subjects?.find(subItem => subItem.name === subjectName);

            columns.forEach(colName => {
                const assessment = sub?.assessments?.find(a => a.name === colName);
                const score = assessment ? (assessment.score !== null ? assessment.score : '') : '';
                row.push(score);
            });

            return row;
        });

        const finalData = [...headerMetadata, tableHeader, ...tableBody];
        const ws = XLSX.utils.aoa_to_sheet(finalData);

        // Merges for header
        const totalCols = tableHeader.length;
        const merges = [];
        for (let i = 0; i < 4; i++) {
            merges.push({ s: { r: i, c: 0 }, e: { r: i, c: totalCols - 1 } });
        }
        ws['!merges'] = merges;

        // Auto-fit widths
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
    },


};

// Global shim for loadGradesPage
window.loadGradesPage = function () {
    Grades.loadGrades();
};
