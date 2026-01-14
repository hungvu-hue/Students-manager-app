const Reports = {
    loadReports: function () {
        const container = document.querySelector('.reports-container');
        if (!container) return;

        const schoolElement = document.getElementById('schoolDropdown');
        const classElement = document.getElementById('classDropdown');

        const schoolId = schoolElement ? schoolElement.dataset.value : '';
        const classId = classElement ? classElement.dataset.value : '';
        const className = document.getElementById('currentClassName')?.textContent || 'Lớp học';

        if (!classId) {
            container.innerHTML = `<div class="empty-state">
                <i class="fas fa-chalkboard-teacher" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                <p>Vui lòng chọn lớp học để xem báo cáo chi tiết.</p>
            </div>`;
            return;
        }

        const students = Storage.getStudents().filter(s => s.classId === classId);
        const subjects = Storage.getSubjects(schoolId);

        this.renderDashboard(container, students, subjects, className);
        this.renderCustomTags();
    },

    renderDashboard: function (container, students, subjects, className) {
        // Calculate Stats
        const totalStudents = students.length;
        const maleCount = students.filter(s => s.gender === 'Nam').length;
        const femaleCount = students.filter(s => s.gender === 'Nữ').length;

        const avgClassScore = totalStudents > 0
            ? (students.reduce((acc, s) => acc + (s.averageScore || 0), 0) / totalStudents).toFixed(1)
            : '0.0';

        const attendanceData = this.getAttendanceAnalytics(students);

        // Get current subject context
        const subjectDropdown = document.getElementById('subjectDropdown');
        const subjectName = subjectDropdown ? subjectDropdown.querySelector('.selected-text').textContent : '';
        const subjectDisplay = subjectName && subjectName !== 'Chọn môn học' ? ` - Môn: ${subjectName}` : '';

        container.innerHTML = `
            <div class="reports-dashboard">
                <!-- Top Summary Cards -->
                <div class="report-header-actions" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--primary-color);"><i class="fas fa-chart-line"></i> Phân tích lớp: ${className}${subjectDisplay}</h3>
                    <button onclick="Reports.loadReports()" class="btn-secondary" style="padding: 8px 15px; border-radius: 20px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-sync-alt"></i> Cập nhật dữ liệu mới
                    </button>
                </div>

                <div class="report-cards">
                    <div class="report-card">
                        <div class="card-icon" style="background: rgba(74, 111, 165, 0.1); color: var(--primary-color);">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="card-data">
                            <h3>${totalStudents}</h3>
                            <p>Sĩ số lớp</p>
                        </div>
                        <div class="card-footer">Nam: ${maleCount} | Nữ: ${femaleCount}</div>
                    </div>
                    <div class="report-card">
                        <div class="card-icon" style="background: rgba(46, 204, 113, 0.1); color: #2ecc71;">
                            <i class="fas fa-star"></i>
                        </div>
                        <div class="card-data">
                            <h3>${avgClassScore}</h3>
                            <p>TB học tập lớp</p>
                        </div>
                        <div class="card-footer">Dựa trên điểm trung bình các môn</div>
                    </div>
                    <div class="report-card">
                        <div class="card-icon" style="background: rgba(243, 156, 18, 0.1); color: #f39c12;">
                            <i class="fas fa-calendar-check"></i>
                        </div>
                        <div class="card-data">
                            <h3>${attendanceData.rate}%</h3>
                            <p>Tỉ lệ chuyên cần</p>
                        </div>
                        <div class="card-footer">Có ${attendanceData.diligentCount} SV đi học đủ 100%</div>
                    </div>
                </div>

                <div class="report-grid">
                    <!-- Academic Performance Ranking -->
                    <div class="report-section">
                        <div class="section-header">
                            <h4><i class="fas fa-trophy" style="color: #f1c40f;"></i> Top học sinh Xuất sắc</h4>
                        </div>
                        <div class="ranking-list">
                            ${this.renderTopStudents(students, 'high')}
                        </div>
                    </div>

                    <!-- Improvement Needed Ranking -->
                    <div class="report-section">
                        <div class="section-header">
                            <h4><i class="fas fa-arrow-up-right-dots" style="color: #e74c3c;"></i> Nhóm cần cải thiện</h4>
                        </div>
                        <div class="ranking-list">
                            ${this.renderTopStudents(students, 'low')}
                        </div>
                    </div>

                    <!-- Diligence Analysis -->
                    <div class="report-section">
                        <div class="section-header">
                            <h4><i class="fas fa-medal" style="color: #2ecc71;"></i> Học sinh chăm chỉ (100%)</h4>
                        </div>
                        <div class="student-tags">
                            ${attendanceData.diligentNames.length > 0
                ? attendanceData.diligentNames.map(name => `<span class="tag tag-success">${name}</span>`).join(', ')
                : '<p class="empty-msg">Chưa có dữ liệu tuyệt đối</p>'}
                        </div>
                    </div>

                    <!-- Absence Alert -->
                    <div class="report-section">
                        <div class="section-header">
                            <h4><i class="fas fa-user-clock" style="color: #e67e22;"></i> Hay nghỉ/Vắng mặt (Top 5)</h4>
                        </div>
                        <div class="student-tags">
                            ${attendanceData.absenteeNames.length > 0
                ? attendanceData.absenteeNames.map(item => `<span class="tag tag-danger">${item.name} (${item.absent} buổi)</span>`).join(', ')
                : '<p class="empty-msg">Lớp đi học rất đều!</p>'}
                        </div>
                    </div>
                </div>

                <!-- Subject Performance Ranking -->
                <div class="report-section" style="margin-bottom: 2rem;">
                    <div class="section-header">
                        <h4><i class="fas fa-book-open"></i> Phân tích hiệu suất môn học</h4>
                    </div>
                    <div class="subject-performance-list">
                        ${this.renderSubjectPerformance(students, subjects)}
                    </div>
                </div>

            </div>
        `;
    },

    getAttendanceAnalytics: function (students) {
        if (students.length === 0) return { rate: 0, diligentCount: 0, diligentNames: [], absenteeNames: [] };

        let totalRecords = 0;
        let presentRecords = 0;
        const diligentNames = [];
        const absenteeNames = [];

        students.forEach(s => {
            let stuPresent = 0;
            let stuTotal = 0;
            let stuAbsent = 0;

            if (s.attendance) {
                const statuses = Object.values(s.attendance);
                stuTotal = statuses.length;
                statuses.forEach(status => {
                    if (status === 'present') presentRecords++, stuPresent++;
                    else if (status === 'unexcused' || status === 'off') stuAbsent++;
                    totalRecords++;
                });
            }

            if (stuTotal > 0 && stuPresent === stuTotal) {
                diligentNames.push(s.name);
            }
            if (stuAbsent >= 1) { // Threshold for "frequent absence" or just "any absence"
                absenteeNames.push({ name: s.name, absent: stuAbsent });
            }
        });

        const rate = totalRecords > 0 ? ((presentRecords / totalRecords) * 100).toFixed(1) : 0;

        return {
            rate: rate,
            diligentCount: diligentNames.length,
            diligentNames: diligentNames.slice(0, 5),
            absenteeNames: absenteeNames.sort((a, b) => b.absent - a.absent).slice(0, 5)
        };
    },

    renderTopStudents: function (students, type) {
        if (students.length === 0) return '<p class="empty-msg">Chưa có dữ liệu học sinh</p>';

        const sorted = [...students].sort((a, b) => {
            return type === 'high'
                ? (b.averageScore || 0) - (a.averageScore || 0)
                : (a.averageScore || 0) - (b.averageScore || 0);
        });

        // Filter for display
        const displayList = sorted.slice(0, 5);

        return displayList.map((s, i) => `
            <div class="ranking-item">
                <div class="rank-num" style="${type === 'low' ? 'background: #e74c3c' : ''}">${i + 1}</div>
                <div class="rank-info">
                    <span class="rank-name">${s.name}</span>
                    <div class="rank-bar-bg"><div class="rank-bar-fill" style="width: ${(s.averageScore || 0) * 10}%; background: ${type === 'low' ? '#e74c3c' : 'var(--accent-color)'}"></div></div>
                </div>
                <div class="rank-score" style="${type === 'low' ? 'color: #e74c3c' : ''}">${(s.averageScore || 0).toFixed(1)}</div>
            </div>
        `).join('');
    },

    renderSubjectPerformance: function (students, subjects) {
        if (subjects.length === 0) return '<p class="empty-msg">Chưa có môn học</p>';

        return subjects.map(sub => {
            let total = 0;
            let count = 0;
            students.forEach(stu => {
                const sData = stu.subjects?.find(s => s.name === sub.name);
                if (sData && sData.score !== null) {
                    total += sData.score;
                    count++;
                }
            });
            const avg = count > 0 ? (total / count).toFixed(1) : '0.0';
            let colorClass = parseFloat(avg) >= 8 ? 'good' : (parseFloat(avg) < 5 ? 'poor' : 'normal');

            return `
                <div class="subject-row">
                    <span class="subject-name">${sub.name}</span>
                    <div class="subject-stats">
                        <span class="subject-avg ${colorClass}">${avg}</span>
                        <div class="subject-bar-container">
                            <div class="subject-bar ${colorClass}" style="width: ${parseFloat(avg) * 10}%"></div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    exportExcel: function (className) {
        const schoolDropdown = document.getElementById('schoolDropdown');
        const schoolName = schoolDropdown ? schoolDropdown.querySelector('.selected-text').textContent : 'Trường';
        const schoolId = schoolDropdown?.dataset.value || '';
        const classId = document.getElementById('classDropdown')?.dataset.value || '';
        const subjectDropdown = document.getElementById('subjectDropdown');
        const subjectName = subjectDropdown ? subjectDropdown.querySelector('.selected-text').textContent : 'Tất cả môn';
        const subjectId = subjectDropdown?.dataset.value || '';

        const students = Storage.getStudents().filter(s => s.classId === classId);
        const subjects = Storage.getSubjects(schoolId);
        const currentSubject = subjects.find(s => s.id === subjectId);
        const currentSubjectName = currentSubject ? currentSubject.name : null;

        if (students.length === 0) {
            showToast('Không có dữ liệu để xuất');
            return;
        }

        const attendanceData = this.getAttendanceAnalytics(students);

        // Calculate Class Average
        const totalStudents = students.length;
        const avgClassScore = totalStudents > 0
            ? (students.reduce((acc, s) => acc + (s.averageScore || 0), 0) / totalStudents).toFixed(1)
            : '0.0';

        // Prepare Metadata (Headers) - Join data into single strings per row to avoid loss during merging
        const top5High = students.sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
            .slice(0, 5).map(s => `${s.name} (${(s.averageScore || 0).toFixed(1)})`).join(', ');

        const top5Low = students.sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0))
            .slice(0, 5).map(s => `${s.name} (${(s.averageScore || 0).toFixed(1)})`).join(', ');

        const metadata = [
            ['BÁO CÁO KẾT QUẢ HỌC TẬP'],
            [`Trường: ${schoolName}`],
            [`Lớp: ${className} - Môn học: ${subjectName}`],
            [`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`],
            [],
            ['THÔNG SỐ CHUNG'],
            [`- Sĩ số: ${totalStudents} học sinh`],
            [`- Tỉ lệ chuyên cần: ${attendanceData.rate}%`],
            [`- Điểm trung bình học tập lớp: ${avgClassScore}`],
            [`- Học sinh chăm chỉ (100%): ${attendanceData.diligentNames.join(', ') || 'Không có'}`],
            [`- Hay nghỉ/Vắng mặt: ${attendanceData.absenteeNames.map(a => `${a.name} (${a.absent} buổi)`).join(', ') || 'Không có'}`],
            [],
            ['PHÂN LOẠI HỌC TẬP'],
            [`Top học sinh xuất sắc: ${top5High || 'Chưa có dữ liệu'}`],
            [`Nhóm cần cải thiện: ${top5Low || 'Chưa có dữ liệu'}`],
            [],
            ['DANH SÁCH CHI TIẾT']
        ];

        // Determine Columns
        let assessmentCols = [];
        if (currentSubjectName) {
            students.forEach(s => {
                const subData = s.subjects?.find(sub => sub.name === currentSubjectName);
                subData?.assessments?.forEach(a => {
                    if (!assessmentCols.includes(a.name)) assessmentCols.push(a.name);
                });
            });
        }

        const tableHeader = ['STT', 'Họ và Tên', 'Ngày sinh', 'Giới tính', 'Chuyên cần', 'Rèn luyện'];
        if (currentSubjectName) {
            assessmentCols.forEach(col => tableHeader.push(col));
        } else {
            subjects.forEach(sub => tableHeader.push(sub.name));
        }
        tableHeader.push('Ghi chú');

        // Prepare Body
        const tableBody = students.map((s, i) => {
            let presentCount = 0;
            let totalSess = 0;
            if (s.attendance) {
                const statuses = Object.values(s.attendance);
                totalSess = statuses.length;
                presentCount = statuses.filter(stat => stat === 'present').length;
            }
            const row = [
                i + 1,
                s.name,
                s.dob || '',
                s.gender || '',
                `${presentCount}/${totalSess}`,
                s.conductScore || 8.0,
            ];

            if (currentSubjectName) {
                const subData = s.subjects?.find(sub => sub.name === currentSubjectName);
                assessmentCols.forEach(colName => {
                    const found = subData?.assessments?.find(a => a.name === colName);
                    // Use only score and existence check, as some assessments might not have an ID
                    const score = (found && (found.score !== null && found.score !== undefined)) ? found.score : '';
                    row.push(score);
                });
            } else {
                subjects.forEach(sub => {
                    const sData = s.subjects?.find(subItem => subItem.name === sub.name);
                    row.push((sData && sData.score !== null) ? sData.score : '');
                });
            }
            row.push(s.notes || s.comments || '');
            return row;
        });

        // Create Workbook
        const finalData = [...metadata, tableHeader, ...tableBody];
        const worksheet = XLSX.utils.aoa_to_sheet(finalData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Báo cáo");

        // Style Logic (Merges) - Merge metadata rows across the table width
        const totalCols = tableHeader.length;
        const merges = [];
        metadata.forEach((row, i) => {
            if (row.length > 0) {
                // Merge the entire row for long metadata strings
                merges.push({ s: { r: i, c: 0 }, e: { r: i, c: totalCols - 1 } });
            }
        });
        worksheet['!merges'] = merges;

        // Auto-fit widths based on the table (Header + Body)
        // We calculate starting from where the table starts
        const tableStartRow = metadata.length;
        const wscols = tableHeader.map((h, i) => {
            let max = h.toString().length;
            tableBody.forEach(row => {
                const cellVal = row[i] ? row[i].toString().length : 0;
                if (cellVal > max) max = cellVal;
            });
            // Heuristic for width: character count + padding
            // Vietnamese characters can be slightly wider in some fonts
            return { wch: Math.min(max + 6, 50) }; // Cap at 50 for very long notes
        });
        worksheet['!cols'] = wscols;

        XLSX.writeFile(workbook, `Bao_cao_${currentSubjectName ? currentSubjectName + '_' : ''}${className.replace(/\s+/g, '_')}.xlsx`);
        showToast(`Đã xuất báo cáo chi tiết cho lớp ${className}`);
    },

    // Custom Word Tags Logic
    editingIndex: -1,

    renderCustomTags: function () {
        const listEl = document.getElementById('customTagsList');
        if (!listEl) return;

        const tags = Storage.getCustomWordTags();
        if (tags.length === 0) {
            listEl.innerHTML = '<p style="font-size: 0.8rem; color: #999; text-align: center;">Chưa có từ khóa tự chọn</p>';
            return;
        }

        const modeLabels = {
            'fixed': 'Cố định',
            'random': 'Ngẫu nhiên',
            'sequence': 'Thứ tự'
        };

        listEl.innerHTML = tags.map((tag, index) => {
            const values = Array.isArray(tag.values) ? tag.values : [tag.value || '---'];
            const valCount = values.length;
            const displayVal = values[0];

            return `
            <div class="tag-item" style="padding: 8px 10px; font-size: 0.8rem; display: flex; flex-direction: column; gap: 4px; align-items: stretch; border-left: 3px solid ${this.editingIndex === index ? 'var(--primary-color)' : 'transparent'}">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div onclick="copyToClipboard('{${tag.key}}')" style="cursor: pointer; font-weight: 600;">
                        <code>{${tag.key}}</code>
                    </div>
                    <div style="display: flex; gap: 5px;">
                        <button onclick="Reports.editCustomTag(${index})" style="background: none; border: none; color: #4a90e2; cursor: pointer; padding: 0 5px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button onclick="Reports.deleteCustomTag(${index})" style="background: none; border: none; color: #e74c3c; cursor: pointer; padding: 0 5px;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div style="font-size: 0.75rem; color: #666; display: flex; justify-content: space-between;">
                    <span>${valCount} nội dung | ${modeLabels[tag.mode || 'fixed']}</span>
                </div>
                <div style="font-size: 0.75rem; color: #888; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #fff; padding: 2px 5px; border-radius: 3px;">
                    ${displayVal}
                </div>
            </div>
        `}).join('');
    },

    addCustomTag: function () {
        const nameInput = document.getElementById('customTagName');
        const valueInput = document.getElementById('customTagValue');
        const modeInput = document.getElementById('customTagMode');
        const saveBtn = document.getElementById('saveCustomTagBtn');

        const key = nameInput.value.trim().replace(/[^a-zA-Z0-9_]/g, '');
        const rawContent = valueInput.value.trim();
        const mode = modeInput ? modeInput.value : 'fixed';

        if (!key || !rawContent) {
            showToast('Vui lòng nhập đầy đủ tên mã và nội dung');
            return;
        }

        const values = rawContent.split('|').map(v => v.trim()).filter(v => v !== '');
        if (values.length === 0) {
            showToast('Nội dung không hợp lệ');
            return;
        }

        const tags = Storage.getCustomWordTags();

        if (this.editingIndex >= 0) {
            // Check if key changed and if new key already exists (other than current)
            const duplicate = tags.find((t, i) => t.key === key && i !== this.editingIndex);
            if (duplicate) {
                showToast('Mã này đã tồn tại!');
                return;
            }
            tags[this.editingIndex] = { key, values, mode };
            showToast('Đã cập nhật từ khóa: {' + key + '}');
            this.editingIndex = -1;
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Lưu từ khóa mới';
        } else {
            if (tags.find(t => t.key === key)) {
                showToast('Mã này đã tồn tại!');
                return;
            }
            tags.push({ key, values, mode });
            showToast('Đã thêm từ khóa: {' + key + '}');
        }

        Storage.saveCustomWordTags(tags);

        nameInput.value = '';
        valueInput.value = '';

        this.renderCustomTags();
    },

    editCustomTag: function (index) {
        const tags = Storage.getCustomWordTags();
        const tag = tags[index];
        if (!tag) return;

        this.editingIndex = index;

        document.getElementById('customTagName').value = tag.key;
        document.getElementById('customTagValue').value = tag.values.join(' | ');
        document.getElementById('customTagMode').value = tag.mode || 'fixed';

        const saveBtn = document.getElementById('saveCustomTagBtn');
        if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-save"></i> Cập nhật từ khóa';

        this.renderCustomTags();
        // Scroll to form
        document.querySelector('.add-custom-tag').scrollIntoView({ behavior: 'smooth' });
    },

    deleteCustomTag: function (index) {
        if (confirm('Bạn có chắc chắn muốn xóa từ khóa này?')) {
            const tags = Storage.getCustomWordTags();
            tags.splice(index, 1);
            Storage.saveCustomWordTags(tags);

            // Reset editing state
            this.editingIndex = -1;
            const saveBtn = document.getElementById('saveCustomTagBtn');
            if (saveBtn) saveBtn.innerHTML = '<i class="fas fa-plus-circle"></i> Lưu từ khóa mới';

            this.renderCustomTags();
            showToast('Đã xóa từ khóa');
        }
    },

    insertSeparator: function () {
        const textarea = document.getElementById('customTagValue');
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const before = text.substring(0, start);
        const after = text.substring(end, text.length);

        // Insert separator with spaces and focus back
        textarea.value = before + " | " + after;
        textarea.selectionStart = textarea.selectionEnd = start + 3;
        textarea.focus();
    }
};

window.Reports = Reports;

window.loadReportsPage = function () {
    Reports.loadReports();
};
