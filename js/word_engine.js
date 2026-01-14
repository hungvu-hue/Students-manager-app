const WordEngine = {
    // Current template in memory (ArrayBuffer)
    currentTemplate: null,

    init: function () {
        // Load saved template from storage
        const saved = Storage.getWordTemplate();
        if (saved) {
            this.currentTemplate = this.base64ToArrayBuffer(saved);
            this.updateStatus(true);
        }

        // Setup event listeners
        const uploadBtn = document.getElementById('uploadWordTemplateBtn');
        const fileInput = document.getElementById('wordTemplateInput');
        const exportBtn = document.getElementById('exportWordBtn');

        if (uploadBtn && fileInput) {
            uploadBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleUpload(e);
        }

        if (exportBtn) {
            exportBtn.onclick = () => {
                const modal = document.getElementById('studentModal');
                const studentId = document.getElementById('modalStudentId').textContent.replace('Mã HS: ', '');
                this.exportForStudent(studentId);
            };
        }

        const exportAllBtn = document.getElementById('exportAllWordBtn');
        if (exportAllBtn) {
            exportAllBtn.onclick = () => this.exportAllInClass();
        }

        const downloadSampleBtn = document.getElementById('wordHelpBtn');
        if (downloadSampleBtn) {
            downloadSampleBtn.onclick = () => {
                if (window.openModal) window.openModal('wordHelpModal');
            };
        }

        const removeBtn = document.getElementById('removeWordTemplateBtn');
        if (removeBtn) {
            removeBtn.onclick = () => this.removeTemplate();
        }

        const batchExportBtn = document.getElementById('batchExportWordBtn');
        if (batchExportBtn) {
            batchExportBtn.onclick = () => this.openBatchModal();
        }
    },

    handleUpload: function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const arrayBuffer = event.target.result;
            const base64 = this.arrayBufferToBase64(arrayBuffer);

            Storage.saveWordTemplate(base64);
            this.currentTemplate = arrayBuffer;
            this.updateStatus(true);
            showToast('Đã tải mẫu Word lên thành công');
        };
        reader.readAsArrayBuffer(file);
    },

    updateStatus: function (isLoaded) {
        const el = document.getElementById('templateStatus');
        const removeBtn = document.getElementById('removeWordTemplateBtn');
        if (el) {
            el.innerHTML = isLoaded
                ? '<i class="fas fa-check-circle" style="color: #27ae60"></i> Đã nạp'
                : '[Chưa nạp]';
            el.style.color = isLoaded ? '#27ae60' : '#888';
        }
        if (removeBtn) {
            removeBtn.style.display = isLoaded ? 'inline-block' : 'none';
        }
    },

    removeTemplate: function () {
        if (confirm('Bạn có chắc chắn muốn xóa mẫu Word hiện tại?')) {
            Storage.removeWordTemplate();
            this.currentTemplate = null;
            this.updateStatus(false);
            // Clear file input so same file can be re-uploaded
            const fileInput = document.getElementById('wordTemplateInput');
            if (fileInput) fileInput.value = '';
            showToast('Đã xóa mẫu Word');
        }
    },

    exportForStudent: function (studentId) {
        if (!this.currentTemplate) {
            alert('Vui lòng tải mẫu file Word (.docx) lên trước!');
            return;
        }

        const students = Storage.getStudents();
        const student = students.find(s => s.id === studentId);
        if (!student) return;

        try {
            // Ensure we have a valid constructor
            const DocxConstructor = window.docxtemplater || window.Docxtemplater;
            if (!DocxConstructor) {
                throw new Error("Không tìm thấy thư viện docxtemplater!");
            }

            const zip = new PizZip(new Uint8Array(this.currentTemplate));
            const doc = new DocxConstructor(zip, {
                paragraphLoop: true,
                linebreaks: true,
                delimiters: { start: '{', end: '}' }
            });

            const customTags = Storage.getCustomWordTags();
            const customData = {};
            customTags.forEach(t => {
                const values = Array.isArray(t.values) ? t.values : [t.value || '---'];
                if (t.mode === 'random' && values.length > 1) {
                    customData[t.key] = values[Math.floor(Math.random() * values.length)];
                } else {
                    customData[t.key] = values[0];
                }
            });

            // Attendance calculation
            let presentCount = 0;
            let totalSess = 0;
            if (student.attendance) {
                const statuses = Object.values(student.attendance);
                totalSess = statuses.length;
                presentCount = statuses.filter(stat => stat === 'present').length;
            }
            const chuyen_can = totalSess > 0 ? `${presentCount}/${totalSess}` : '0/0';

            // Selected grade on grid
            const subjectDropdown = document.getElementById('subjectDropdown');
            const selectedSubjectId = subjectDropdown ? subjectDropdown.dataset.value : '';
            const displaySettings = Storage.getDisplaySettings();
            const displayColName = selectedSubjectId ? displaySettings[selectedSubjectId] : null;

            let diem_so_chon = '--';
            if (selectedSubjectId) {
                const schoolId = document.getElementById('schoolDropdown')?.dataset.value;
                const subjects = Storage.getSubjects(schoolId);
                const sub = subjects.find(s => s.id === selectedSubjectId);
                if (sub) {
                    const studentSub = student.subjects ? student.subjects.find(s => s.name === sub.name) : null;
                    if (displayColName && studentSub && studentSub.assessments) {
                        const assessment = studentSub.assessments.find(a => a.name === displayColName);
                        diem_so_chon = assessment && assessment.score !== null ? assessment.score : '--';
                    } else if (studentSub) {
                        diem_so_chon = studentSub.score !== null ? studentSub.score : '--';
                    }
                }
            }

            const schoolName = document.getElementById('currentSchoolName')?.textContent || '---';
            const className = document.getElementById('currentClassName')?.textContent || '---';
            const subjectName = document.getElementById('currentSubjectName')?.textContent || '---';

            const data = {
                ten_truong: schoolName,
                ten_lop: className,
                ten_mon_hoc: subjectName,
                ho_ten: student.name || '---',
                ngay_sinh: student.dob || '---',
                gioi_tinh: student.gender || '---',
                chuyen_can: chuyen_can,
                diem_so_chon: diem_so_chon,
                hanh_kiem: student.conduct || '---',
                nhan_xet: student.comments || (student.notes || 'Chưa có nhận xét'),
                ngay_xuat: new Date().toLocaleDateString('vi-VN'),
                ...customData
            };

            doc.render(data);

            const out = doc.getZip().generate({
                type: "blob",
                mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            });

            saveAs(out, `Phieu_${student.name.replace(/\s+/g, '_')}.docx`);
            showToast(`Đã xuất file Word cho ${student.name}`);
        } catch (error) {
            console.error("Word Export Error:", error);
            let msg = 'Lỗi xử lý file Word.';
            if (error.properties && error.properties.errors instanceof Array) {
                msg += '\nChi tiết: ' + error.properties.errors.map(e => e.properties.explanation).join('\n');
            } else if (error.message) {
                msg += '\nLỗi: ' + error.message;
            }
            alert(msg + '\n\nHướng dẫn: Kiểm tra lại các thẻ { ... } trong mẫu Word.');
        }
    },

    exportAllInClass: async function () {
        if (!this.currentTemplate) {
            alert('Vui lòng tải mẫu file Word (.docx) lên trước!');
            return;
        }

        const currentClassId = document.getElementById('classDropdown').dataset.value;
        const schoolId = document.getElementById('schoolDropdown').dataset.value;
        const currentClassName = document.getElementById('currentClassName').textContent;

        if (!currentClassId) {
            alert('Vui lòng chọn lớp học trước!');
            return;
        }

        // Add loading state
        const exportBtn = document.getElementById('exportAllWordBtn');
        const originalText = exportBtn.innerHTML;
        exportBtn.disabled = true;
        exportBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xuất...';

        try {
            const schools = Storage.getSchools();
            const school = schools.find(s => s.id === schoolId);
            const students = Storage.getStudents().filter(s => s.classId === currentClassId);

            if (students.length === 0) {
                alert('Lớp học này không có học sinh!');
                return;
            }

            const DocxConstructor = window.docxtemplater || window.Docxtemplater;
            if (!DocxConstructor) {
                console.error("Docxtemplater library not found. Please check network connection or script includes.");
                throw new Error("Không thể tìm thấy trình tạo Word. Vui lòng kiểm tra lại kết nối mạng.");
            }

            const content = await this.generateClassWordBlob(currentClassId, currentClassName, school, students, DocxConstructor);
            saveAs(content, `Nhan_Xet_Lop_${currentClassName.replace(/\s/g, '_')}.docx`);
            showToast('Đã xuất file Word thành công!');
        } catch (error) {
            console.error("Word Export Error:", error);
            alert('Lỗi khi xuất Word: ' + error.message);
        } finally {
            exportBtn.disabled = false;
            exportBtn.innerHTML = originalText;
        }
    },

    // Reusable helper to generate a single class Word doc as a blob
    generateClassWordBlob: async function (classId, className, school, studentsInClass, DocxConstructor) {
        return new Promise((resolve, reject) => {
            try {
                if (!this.currentTemplate) {
                    return reject(new Error("Chưa có mẫu Word trong bộ nhớ."));
                }

                if (typeof PizZip === 'undefined') {
                    return reject(new Error("Thư viện PizZip chưa được tải. Vui lòng kiểm tra lại."));
                }

                const zip = new PizZip(new Uint8Array(this.currentTemplate));
                const doc = new DocxConstructor(zip, {
                    paragraphLoop: true,
                    linebreaks: true,
                    delimiters: { start: '{', end: '}' }
                });

                const subjectDropdown = document.getElementById('subjectDropdown');
                const selectedSubjectId = subjectDropdown ? subjectDropdown.dataset.value : '';

                const schoolId = school ? school.id : (document.getElementById('schoolDropdown')?.dataset.value);
                const subjects = Storage.getSubjects(schoolId);
                const sub = subjects.find(s => s.id === selectedSubjectId);
                const selectedSubjectName = sub ? sub.name : '---';

                // Get analytics from Reports if available
                const reportsAnalytics = (typeof Reports !== 'undefined' && Reports.getAttendanceAnalytics)
                    ? Reports.getAttendanceAnalytics(studentsInClass)
                    : { diligentNames: [], absenteeNames: [] };

                const topStudents = (typeof Reports !== 'undefined' && Reports.getTopStudents)
                    ? Reports.getTopStudents(studentsInClass)
                    : [];

                const customTags = Storage.getCustomWordTags();

                const studentsData = studentsInClass.map((student, index) => {
                    const studentCustomData = {};
                    customTags.forEach(t => {
                        const values = Array.isArray(t.values) ? t.values : [t.value || '---'];
                        if (t.mode === 'random') {
                            studentCustomData[t.key] = values[Math.floor(Math.random() * values.length)];
                        } else if (t.mode === 'sequence') {
                            studentCustomData[t.key] = values[index % values.length];
                        } else {
                            studentCustomData[t.key] = values[0];
                        }
                    });

                    let presentCount = 0;
                    let totalSess = 0;
                    if (student.attendance) {
                        const statuses = Object.values(student.attendance);
                        totalSess = statuses.length;
                        presentCount = statuses.filter(stat => stat === 'present').length;
                    }

                    let diem_so_chon = '---';
                    if (selectedSubjectName !== '---') {
                        const sSub = student.subjects ? student.subjects.find(s => s.name === selectedSubjectName) : null;
                        if (sSub && sSub.score !== null) diem_so_chon = sSub.score;
                    }

                    return {
                        ...student,
                        stt: index + 1,
                        truong: school ? school.name : '---',
                        lop: className,
                        mon: selectedSubjectName,
                        chuyen_can: totalSess > 0 ? `${presentCount}/${totalSess}` : '0/0',
                        diem_so_chon: diem_so_chon,
                        nhan_xet: student.comments || (student.notes || '---'),
                        ...studentCustomData
                    };
                });

                const data = {
                    students: studentsData,
                    truong: school ? school.name : '---',
                    lop: className,
                    mon: selectedSubjectName,
                    is_batch: true,
                    ngay_xuat: new Date().toLocaleDateString('vi-VN'),
                    hoc_sinh_cham_chi: reportsAnalytics.diligentNames.join(', ') || '---',
                    hoc_sinh_vang: reportsAnalytics.absenteeNames.join(', ') || '---',
                    top_hoc_sinh: topStudents.slice(0, 5).map(s => s.name).join(', ') || '---'
                };

                doc.render(data);

                const out = doc.getZip().generate({
                    type: "uint8array",
                    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                });
                resolve(out);
            } catch (error) {
                reject(error);
            }
        });
    },

    openBatchModal: function () {
        if (!this.currentTemplate) {
            alert('Vui lòng tải mẫu file Word (.docx) lên trước!');
            return;
        }
        this.renderBatchList();
        if (window.openModal) window.openModal('batchWordModal');
    },

    renderBatchList: function () {
        const container = document.getElementById('batchSchoolList');
        if (!container) return;

        const schools = Storage.getSchools();
        if (schools.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #999;">Chưa có dữ liệu trường học.</p>';
            return;
        }

        container.innerHTML = schools.map(school => {
            const classes = Storage.getClasses(school.id);
            if (classes.length === 0) return '';

            return `
                <div class="batch-school-item" style="margin-bottom: 15px;">
                    <div style="display: flex; align-items: center; gap: 10px; font-weight: 600; padding: 5px; background: #eee; border-radius: 4px; margin-bottom: 8px;">
                        <input type="checkbox" class="school-cb" data-school-id="${school.id}" onchange="WordEngine.toggleSchoolClasses('${school.id}', this.checked)">
                        <span>${school.name}</span>
                    </div>
                    <div class="batch-classes" style="padding-left: 25px; display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 10px;">
                        ${classes.map(cls => `
                            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
                                <input type="checkbox" class="class-cb school-${school.id}-cb" data-class-id="${cls.id}" data-school-id="${cls.schoolId}">
                                <span>${cls.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('') || '<p style="text-align: center; color: #999;">Không có lớp học nào để xuất.</p>';
    },

    toggleSchoolClasses: function (schoolId, checked) {
        const classCBs = document.querySelectorAll(`.school-${schoolId}-cb`);
        classCBs.forEach(cb => cb.checked = checked);
    },

    toggleAllSchools: function (checked) {
        document.querySelectorAll('.school-cb, .class-cb').forEach(cb => cb.checked = checked);
    },

    startBatchExport: async function () {
        const checkboxes = document.querySelectorAll('.class-cb:checked');
        const selectedClasses = Array.from(checkboxes).map(cb => ({
            classId: cb.dataset.classId,
            schoolId: cb.dataset.schoolId,
            className: cb.closest('label').querySelector('span').textContent.trim()
        }));

        if (selectedClasses.length === 0) {
            alert('Vui lòng chọn ít nhất một lớp học!');
            return;
        }

        const btn = document.getElementById('startBatchExportBtn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xử lý...';

        try {
            if (typeof JSZip === 'undefined') {
                throw new Error("Thư viện JSZip chưa được tải. Vui lòng làm mới trang.");
            }
            const zip = new JSZip();
            const schools = Storage.getSchools();
            const DocxConstructor = window.docxtemplater || window.Docxtemplater;

            if (!DocxConstructor) {
                throw new Error("Thư viện Docxtemplater chưa được tải. Vui lòng làm mới trang.");
            }

            let successCount = 0;
            for (const item of selectedClasses) {
                const school = schools.find(s => s.id === item.schoolId);
                const students = Storage.getStudents().filter(s => s.classId === item.classId);

                if (students.length === 0) {
                    console.warn(`Lớp ${item.className} không có học sinh, bỏ qua.`);
                    continue;
                }

                try {
                    const content = await this.generateClassWordBlob(item.classId, item.className, school, students, DocxConstructor);
                    const safeSchool = (school ? school.name : 'Truong').replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
                    const safeClass = item.className.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_');
                    const fileName = `${safeSchool}_${safeClass}.docx`;

                    zip.file(fileName, content);
                    successCount++;
                } catch (err) {
                    console.error(`Lỗi khi xuất lớp ${item.className}:`, err);
                }
            }

            if (successCount === 0) {
                throw new Error("Không có dữ liệu hợp lệ để xuất (các lớp có thể chưa có học sinh).");
            }

            const archiveContent = await zip.generateAsync({ type: "blob" });
            saveAs(archiveContent, `Bao_Cao_Hang_Loat_${new Date().getTime()}.zip`);

            showToast(`Đã xuất thành công ${successCount} lớp học!`);
            closeModal('batchWordModal');
        } catch (error) {
            console.error("Batch Word Export Error:", error);
            alert('Lỗi xuất hàng loạt: ' + error.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    },


    // Helpers
    arrayBufferToBase64: function (buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    base64ToArrayBuffer: function (base64) {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    }
};

window.WordEngine = WordEngine;
