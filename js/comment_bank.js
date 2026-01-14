const CommentBank = {
    // Default comments
    defaults: {
        'Giỏi': [
            "Tiếp thu bài nhanh, có tố chất thông minh.",
            "Thông minh, sáng tạo, hoàn thành tốt các bài tập.",
            "Ý thức học tập rất tốt, gương mẫu trong các hoạt động.",
            "Có kiến thức vững chắc, đạt thành tích cao trong học tập.",
            "Tích cực xây dựng bài, có tư duy logic tốt."
        ],
        'Khá': [
            "Có ý thức học tập, nắm vững kiến thức cơ bản.",
            "Tiếp thu được bài, cần chú ý rèn luyện thêm chữ viết.",
            "Học bài và làm bài đầy đủ, tích cực tham gia hoạt động lớp.",
            "Có nhiều cố gắng trong học tập, đôi lúc còn thiếu tập trung.",
            "Kết quả học tập khá, cần phát huy hơn nữa năng lực cá nhân."
        ],
        'Trung bình': [
            "Nắm được kiến thức cơ bản nhưng chưa sâu.",
            "Cần cố gắng nhiều hơn nữa trong kỳ học tới.",
            "Đôi lúc còn quên làm bài tập về nhà, cần chú ý hơn.",
            "Tiếp thu bài còn chậm, cần dành thêm thời gian tự học.",
            "Cần sự kèm cặp sát sao hơn từ phía gia đình."
        ],
        'Hạnh kiểm': [
            "Lễ phép, ngoan ngoãn, hòa đồng với bạn bè.",
            "Chấp hành tốt nội quy trường lớp.",
            "Năng nổ, nhiệt tình trong các hoạt động phong trào.",
            "Cần chú ý hơn về tác phong và kỷ luật.",
            "Có tinh thần tương thân tương ái, hay giúp đỡ bạn bè."
        ]
    },

    get: function (category) {
        const custom = Storage.getCustomComments() || {};
        const base = this.defaults[category] || [];
        const userAdded = custom[category] || [];
        return [...base, ...userAdded];
    },

    add: function (category, text) {
        const custom = Storage.getCustomComments() || {};
        if (!custom[category]) custom[category] = [];
        if (!custom[category].includes(text)) {
            custom[category].push(text);
            Storage.saveCustomComments(custom);
        }
    },

    remove: function (category, text) {
        const custom = Storage.getCustomComments() || {};
        if (custom[category]) {
            custom[category] = custom[category].filter(t => t !== text);
            Storage.saveCustomComments(custom);
            return true;
        }
        return false;
    }
};

function loadQuickComments(avgScore) {
    const container = document.getElementById('quickCommentBank');
    if (!container) return;

    // Keep the label
    container.innerHTML = '<span style="font-size: 0.8rem; color: #666; width: 100%;">Gợi ý nhanh (theo học lực):</span>';

    let category = 'Khá';
    if (avgScore >= 8.0) category = 'Giỏi';
    else if (avgScore >= 5.0 && avgScore < 6.5) category = 'Trung bình';
    else if (avgScore < 5.0) category = 'Trung bình'; // Minimal sample

    // Add specific category tags
    renderCategoryTags(container, category, avgScore);

    // Add Hạnh kiểm tags
    renderCategoryTags(container, 'Hạnh kiểm', avgScore);
}

function renderCategoryTags(container, category, avgScore) {
    const header = document.createElement('div');
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.width = '100%';
    header.style.marginTop = '8px';

    header.innerHTML = `
        <span class="comment-category">${category}</span>
        <button class="btn-icon-small" onclick="promptAddComment('${category}', ${avgScore})" title="Thêm gợi ý cho ${category}" 
                style="width: 20px; height: 20px; font-size: 0.7rem; background: #e0e7ff; color: #4338ca;">
            <i class="fas fa-plus"></i>
        </button>
    `;
    container.appendChild(header);

    const comments = CommentBank.get(category);
    const customComments = (Storage.getCustomComments() || {})[category] || [];

    comments.forEach(text => {
        const isCustom = customComments.includes(text);
        const tag = document.createElement('span');
        tag.className = 'comment-tag';
        if (isCustom) tag.classList.add('custom-tag');

        tag.innerHTML = `
            <span class="tag-text">${text}</span>
            ${isCustom ? `<span class="tag-delete" title="Xóa gợi ý này">&times;</span>` : ''}
        `;

        // Click text to insert
        tag.querySelector('.tag-text').onclick = (e) => {
            e.stopPropagation();
            insertComment(text);
        };

        // Click X to delete (only for custom)
        if (isCustom) {
            tag.querySelector('.tag-delete').onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Xóa gợi ý: "${text}"?`)) {
                    CommentBank.remove(category, text);
                    loadQuickComments(avgScore);
                }
            };
        }

        container.appendChild(tag);
    });
}

function insertComment(text) {
    const textarea = document.getElementById('studentNotes');
    const current = textarea.value.trim();
    if (current && !current.endsWith('.') && !current.endsWith(',')) {
        textarea.value = current + ". " + text;
    } else if (current) {
        textarea.value = current + " " + text;
    } else {
        textarea.value = text;
    }
}

function promptAddComment(category, avgScore) {
    const text = prompt(`Nhập nội dung nhận xét mới cho loại [${category}]:`);
    if (text && text.trim()) {
        CommentBank.add(category, text.trim());
        loadQuickComments(avgScore);
        if (window.showToast) window.showToast(`Đã thêm gợi ý mới vào mục ${category}`);
    }
}

window.promptAddComment = promptAddComment;

window.loadQuickComments = loadQuickComments;
