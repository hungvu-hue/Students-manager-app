
// Mailbox Logic System - Threaded Version
const Mailbox = {
    init: function () {
        this.addEventListeners();
        this.updateBadge();

        // Initial check on login - show notification if there are unread messages
        this.lastMessageCount = 0; // Set to 0 so the first check will trigger if count > 0
        this.checkNewMessages(true); // pass true to indicate it's the initial login check

        // Check for new messages periodically
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = setInterval(() => this.checkNewMessages(), 5000); // 5s for better real-time feel

        // Listen for storage changes in other tabs
        window.removeEventListener('storage', this._storageListener);
        this._storageListener = (e) => {
            if (e.key === 'system_messages') {
                this.checkNewMessages();
                // If mailbox is open and something changed, refresh the list
                const mailboxModal = document.getElementById('mailboxModal');
                if (mailboxModal && mailboxModal.classList.contains('active')) {
                    this.renderThreadList();
                }
            }
        };
        window.addEventListener('storage', this._storageListener);
    },

    refreshInterval: null,
    _storageListener: null,

    addEventListeners: function () {
        const mailboxBtn = document.getElementById('mailboxBtn');
        if (mailboxBtn) {
            mailboxBtn.addEventListener('click', () => this.openMailbox());
        }

        const composeBtn = document.getElementById('composeBtn');
        if (composeBtn) {
            composeBtn.addEventListener('click', () => this.openCompose());
        }

        const composeForm = document.getElementById('composeMessageForm');
        if (composeForm) {
            // Remove old listeners if any (though unlikely)
            const newForm = composeForm.cloneNode(true);
            composeForm.parentNode.replaceChild(newForm, composeForm);
            newForm.addEventListener('submit', (e) => this.handleSendMessage(e));
        }

        const groupSelect = document.getElementById('msgQuickSelectGroup');
        if (groupSelect) {
            groupSelect.addEventListener('change', (e) => this.loadQuickSelectTeachers(e.target.value));
        }

        const quickReplyBtn = document.getElementById('sendQuickReplyBtn');
        if (quickReplyBtn) {
            quickReplyBtn.addEventListener('click', () => this.handleQuickReply());
        }
    },

    lastMessageCount: 0,
    checkNewMessages: function (isInitial = false) {
        const currentUser = Storage.getTeacher();
        if (!currentUser) return;

        const allMessages = Storage.getMessages();
        const unreadToUser = allMessages.filter(m =>
            m.to.toLowerCase() === currentUser.email.toLowerCase() && !m.read
        );

        const currentCount = unreadToUser.length;

        if (isInitial) {
            if (currentCount > 0) {
                showToast(`Chào mừng! Bạn có ${currentCount} tin nhắn chưa đọc`, 'info');
            }
        } else if (currentCount > this.lastMessageCount) {
            // New message arrived while user is active
            showToast(`Bạn vừa nhận được tin nhắn mới (${currentCount})`, 'info');

            // If mailbox is open, refresh automatically
            const mailboxModal = document.getElementById('mailboxModal');
            if (mailboxModal && mailboxModal.classList.contains('active')) {
                this.renderThreadList();
                if (this.currentViewingThreadId) {
                    this.viewThread(this.currentViewingThreadId, false);
                }
            }
        }

        this.lastMessageCount = currentCount;
        this.updateBadge();
    },

    updateBadge: function () {
        const currentUser = Storage.getTeacher();
        if (!currentUser) return;

        const allMessages = Storage.getMessages();
        const unreadCount = allMessages.filter(m =>
            m.to.toLowerCase() === currentUser.email.toLowerCase() && !m.read
        ).length;

        const badge = document.getElementById('unreadMessageBadge');
        if (badge) {
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            } else {
                badge.style.display = 'none';
            }
        }
    },

    openMailbox: function () {
        this.renderThreadList();
        openModal('mailboxModal');
    },

    renderThreadList: function () {
        const list = document.getElementById('messageItemsList');
        if (!list) return;

        const currentUser = Storage.getTeacher();
        if (!currentUser) return;
        const email = currentUser.email.toLowerCase();
        const allMessages = Storage.getMessagesForUser(email);

        const threads = {};
        allMessages.forEach(msg => {
            const tid = msg.threadId || msg.id;
            if (!threads[tid]) {
                threads[tid] = {
                    id: tid,
                    messages: [],
                    latestTimestamp: msg.timestamp,
                    subject: msg.subject,
                    participants: new Set()
                };
            }
            threads[tid].messages.push(msg);
            threads[tid].participants.add(msg.from);
            threads[tid].participants.add(msg.to);
            if (new Date(msg.timestamp) > new Date(threads[tid].latestTimestamp)) {
                threads[tid].latestTimestamp = msg.timestamp;
                threads[tid].subject = msg.subject;
            }
        });

        const sortedThreads = Object.values(threads).sort((a, b) =>
            new Date(b.latestTimestamp) - new Date(a.latestTimestamp)
        );

        if (sortedThreads.length === 0) {
            list.innerHTML = '<p style="text-align: center; color: #999; margin-top: 20px;">Không có tin nhắn nào</p>';
            return;
        }

        list.innerHTML = '';
        sortedThreads.forEach(thread => {
            const latestToUser = thread.messages
                .filter(m => m.to.toLowerCase() === email)
                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

            const isUnread = latestToUser && !latestToUser.read;
            const lastMsg = thread.messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];

            const item = document.createElement('div');
            item.className = 'message-item';
            item.style = `
                padding: 15px;
                border-radius: 12px;
                cursor: pointer;
                background: ${isUnread ? '#fff' : 'transparent'};
                border: 1px solid ${isUnread ? '#e2e8f0' : 'transparent'};
                box-shadow: ${isUnread ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'};
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                margin-bottom: 8px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                position: relative;
            `;

            // Add hover effect via JS since it's inline style
            item.onmouseover = () => {
                if (!isUnread) item.style.background = '#edf2f7';
                item.style.transform = 'translateY(-2px)';
            };
            item.onmouseout = () => {
                if (!isUnread) item.style.background = 'transparent';
                item.style.transform = 'translateY(0)';
            };

            const date = new Date(thread.latestTimestamp).toLocaleDateString('vi-VN');
            const otherParticipant = Array.from(thread.participants).find(p => p.toLowerCase() !== email) || email;

            const contentDiv = document.createElement('div');
            contentDiv.style = 'flex: 1; overflow: hidden;';
            contentDiv.innerHTML = `
                <div style="display: flex; gap: 12px; align-items: flex-start;">
                    <div style="position: relative; flex-shrink: 0;">
                        <div style="width: 44px; height: 44px; background: ${isUnread ? '#4a90e2' : '#e2e8f0'}; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: ${isUnread ? '#fff' : '#64748b'};">
                            <i class="fas ${isUnread ? 'fa-envelope' : 'fa-envelope-open'}" style="font-size: 1.1rem;"></i>
                        </div>
                        ${isUnread ? '<span style="position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; background: #ef4444; border: 2px solid #fff; border-radius: 50%;"></span>' : ''}
                    </div>
                    <div style="flex: 1; overflow: hidden;">
                        <div style="font-weight: 700; font-size: 0.95rem; color: #1e293b; margin-bottom: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${thread.subject}
                        </div>
                        <div style="font-size: 0.8rem; font-weight: 600; color: #4a90e2; margin-bottom: 2px;">
                            ${otherParticipant}
                        </div>
                        <div style="font-size: 0.75rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.8;">
                            ${lastMsg.content}
                        </div>
                    </div>
                </div>
            `;
            contentDiv.onclick = () => this.viewThread(thread.id);

            const actionsDiv = document.createElement('div');
            actionsDiv.style = 'display: flex; flex-direction: column; align-items: flex-end; gap: 10px; margin-left: 10px;';
            actionsDiv.innerHTML = `
                <div style="font-size: 0.7rem; color: #999;">${date}</div>
                <button class="btn-icon delete-thread-btn" title="Xóa hội thoại" style="color: #e74c3c; font-size: 0.8rem; padding: 4px;">
                    <i class="fas fa-trash-alt"></i>
                </button>
            `;

            actionsDiv.querySelector('.delete-thread-btn').onclick = (e) => {
                e.stopPropagation();
                if (confirm('Xóa toàn bộ cuộc hội thoại này?')) {
                    thread.messages.forEach(m => Storage.deleteMessage(m.id));
                    if (this.currentViewingThreadId === thread.id) {
                        document.getElementById('messageDetailContent').style.display = 'none';
                        document.getElementById('messageDetailEmpty').style.display = 'block';
                    }
                    this.renderThreadList();
                    this.updateBadge();
                    showToast('Đã xóa hội thoại');
                }
            };

            item.appendChild(contentDiv);
            item.appendChild(actionsDiv);
            list.appendChild(item);
        });
    },

    currentViewingThreadId: null,
    viewThread: function (threadId, refreshList = true) {
        this.currentViewingThreadId = threadId;
        const currentUser = Storage.getTeacher();
        if (!currentUser) return;
        const email = currentUser.email.toLowerCase();

        const allMessages = Storage.getMessagesForUser(email);
        const threadMessages = allMessages
            .filter(m => (m.threadId || m.id) === threadId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        if (threadMessages.length === 0) return;

        let needsRefresh = false;
        threadMessages.forEach(m => {
            if (m.to.toLowerCase() === email && !m.read) {
                Storage.markMessageAsRead(m.id);
                needsRefresh = true;
            }
        });

        if (needsRefresh) {
            this.updateBadge();
            this.lastMessageCount = Storage.getMessages().filter(m =>
                m.to.toLowerCase() === email && !m.read
            ).length;
            if (refreshList) this.renderThreadList();
        }

        document.getElementById('messageDetailEmpty').style.display = 'none';
        const detail = document.getElementById('messageDetailContent');
        detail.style.display = 'flex'; // Use flex for the new structure

        const subjectHeader = document.getElementById('msgDetailSubject');
        subjectHeader.textContent = threadMessages[0].subject;

        let chatHist = document.getElementById('chatHistoryView');

        const newContent = JSON.stringify(threadMessages);
        if (chatHist.getAttribute('data-last-sync') !== newContent) {
            chatHist.innerHTML = '';
            threadMessages.forEach(msg => {
                const isMe = msg.from.toLowerCase() === email;
                const bubble = document.createElement('div');
                bubble.style = `
                    max-width: 75%;
                    padding: 12px 18px;
                    font-size: 0.95rem;
                    line-height: 1.5;
                    position: relative;
                    box-shadow: 0 2px 5px rgba(0,0,0,0.03);
                    border-radius: ${isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px'};
                    ${isMe ?
                        'align-self: flex-end; background: linear-gradient(135deg, #4a90e2, #357abd); color: white;' :
                        'align-self: flex-start; background: white; color: #1e293b; border: 1px solid #eef2f6;'}
                `;

                const time = new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                const dateHeader = new Date(msg.timestamp).toLocaleDateString('vi-VN');

                bubble.innerHTML = `
                    <div style="font-size: 0.7rem; color: ${isMe ? 'rgba(255,255,255,0.8)' : '#64748b'}; margin-bottom: 5px; font-weight: 600;">
                        ${isMe ? 'Bạn' : msg.fromName}
                    </div>
                    <div style="white-space: pre-wrap; word-break: break-word;">${msg.content}</div>
                    <div style="font-size: 0.65rem; color: ${isMe ? 'rgba(255,255,255,0.7)' : '#94a3b8'}; text-align: right; margin-top: 6px;">
                        ${dateHeader} ${time}
                    </div>
                `;
                chatHist.appendChild(bubble);
            });
            chatHist.setAttribute('data-last-sync', newContent);
            setTimeout(() => chatHist.scrollTop = chatHist.scrollHeight, 50);
        }

        const delBtn = document.getElementById('deleteMsgBtn');
        delBtn.parentElement.style.display = 'flex';
        delBtn.onclick = () => {
            if (confirm('Xóa toàn bộ cuộc hội thoại này?')) {
                threadMessages.forEach(m => Storage.deleteMessage(m.id));
                detail.style.display = 'none';
                document.getElementById('messageDetailEmpty').style.display = 'block';
                this.renderThreadList();
                this.updateBadge();
                showToast('Đã xóa hội thoại');
            }
        };

        const replyBtn = document.getElementById('replyMsgBtn');
        if (replyBtn) {
            replyBtn.onclick = () => {
                const lastMsg = threadMessages[threadMessages.length - 1];
                const recipient = lastMsg.from.toLowerCase() === email ? lastMsg.to : lastMsg.from;
                this.openCompose(recipient, `Re: ${threadMessages[0].subject}`, threadId);
            };
        }
    },

    handleQuickReply: function () {
        if (!this.currentViewingThreadId) return;

        const currentUser = Storage.getTeacher();
        const content = document.getElementById('quickReplyContent').value.trim();
        if (!content) return;

        const email = currentUser.email.toLowerCase();
        const allMessages = Storage.getMessagesForUser(email);
        const threadMessages = allMessages.filter(m => (m.threadId || m.id) === this.currentViewingThreadId);
        if (threadMessages.length === 0) return;

        const firstMsg = threadMessages[0];
        const recipients = new Set();
        threadMessages.forEach(m => {
            recipients.add(m.from.toLowerCase());
            recipients.add(m.to.toLowerCase());
        });
        recipients.delete(email);
        const toEmail = Array.from(recipients)[0] || (firstMsg.from.toLowerCase() === email ? firstMsg.to : firstMsg.from);

        Storage.sendMessage(
            currentUser.email,
            currentUser.name,
            toEmail,
            firstMsg.subject,
            content,
            this.currentViewingThreadId
        );

        document.getElementById('quickReplyContent').value = '';
        this.viewThread(this.currentViewingThreadId);
        showToast('Đã gửi trả lời');
    },

    openCompose: function (toEmail = '', subject = '', threadId = null) {
        const form = document.getElementById('composeMessageForm');
        form.reset();

        if (toEmail) document.getElementById('msgToEmail').value = toEmail;
        if (subject) document.getElementById('msgSubject').value = subject;
        form.dataset.threadId = threadId || '';

        const groupSelect = document.getElementById('msgQuickSelectGroup');
        const groups = Storage.getGroups();
        groupSelect.innerHTML = '<option value="">Chọn từ nhóm...</option>';


        groups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.id;
            opt.textContent = g.name;
            groupSelect.appendChild(opt);
        });

        document.getElementById('msgQuickSelectTeachers').style.display = 'none';
        openModal('composeMessageModal');
    },

    loadQuickSelectTeachers: function (groupId) {
        const list = document.getElementById('msgQuickSelectTeachers');
        if (!groupId || groupId === "") {
            list.style.display = 'none';
            return;
        }

        const teachers = Storage.getAuthorizedTeachers();
        const currentUser = Storage.getTeacher();
        let members = [];

        const groups = Storage.getGroups();
        const group = groups.find(g => g.id === groupId);
        if (group) members = group.members;

        members = members.filter(email => email.toLowerCase() !== currentUser.email.toLowerCase());

        if (members.length === 0) {
            list.innerHTML = '<p style="font-size: 0.75rem; color: #999; text-align: center;">Không có giáo viên nào</p>';
        } else {
            list.innerHTML = '';
            members.forEach(email => {
                const teacher = teachers.find(t => t.email === email);
                if (!teacher) return;

                const item = document.createElement('div');
                item.style = 'padding: 6px 8px; cursor: pointer; font-size: 0.8rem; border-bottom: 1px solid #eee; transition: background 0.2s;';
                item.innerHTML = `<b>${teacher.name}</b> <br> <span style="color: #666; font-size: 0.75rem;">${email}</span>`;
                item.onmouseover = () => item.style.background = '#eef2f7';
                item.onmouseout = () => item.style.background = 'transparent';
                item.onclick = () => {
                    document.getElementById('msgToEmail').value = email;
                    list.style.display = 'none';
                };
                list.appendChild(item);
            });
        }
        list.style.display = 'block';
    },

    handleSendMessage: function (e) {
        e.preventDefault();
        const currentUser = Storage.getTeacher();
        const toEmail = document.getElementById('msgToEmail').value.trim();
        const subject = document.getElementById('msgSubject').value.trim();
        const content = document.getElementById('msgContent').value.trim();
        const threadId = e.target.dataset.threadId || null;

        if (!toEmail || !subject || !content) return;

        const teachers = Storage.getAuthorizedTeachers();
        const recipient = teachers.find(t => t.email.toLowerCase() === toEmail.toLowerCase());

        if (!recipient) {
            alert('Email người nhận không tồn tại trong hệ thống!');
            return;
        }

        if (toEmail.toLowerCase() === currentUser.email.toLowerCase()) {
            alert('Bạn không thể gửi tin nhắn cho chính mình!');
            return;
        }

        Storage.sendMessage(currentUser.email, currentUser.name, toEmail, subject, content, threadId);

        closeModal(document.getElementById('composeMessageModal'));
        showToast('Đã gửi tin nhắn thành công');

        if (threadId && this.currentViewingThreadId === threadId) {
            this.viewThread(threadId);
        } else {
            this.renderThreadList();
        }
    }
};

// Auto-init Mailbox
document.addEventListener('DOMContentLoaded', () => {
    Mailbox.init();
});
