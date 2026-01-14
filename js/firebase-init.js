// Firebase Configuration - REPLACE WITH YOUR PROJECT CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBH3XnG_K8eOZxS_ybEwuPeKhFVuattFmg",
    authDomain: "students-manager-app.firebaseapp.com",
    projectId: "students-manager-app",
    storageBucket: "students-manager-app.firebasestorage.app",
    messagingSenderId: "219777266818",
    appId: "1:219777266818:web:1c61324e5a3cdcf77ff09b",
    measurementId: "G-N2ZBN8DTDK"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Services
const auth = firebase.auth();
const db = firebase.firestore();
const analytics = firebase.analytics();

// Cloud Storage Service
const CloudSync = {
    // Save data to cloud
    save: async function (collection, data) {
        const user = auth.currentUser;
        if (!user) return;

        try {
            await db.collection('users').doc(user.email).collection(collection).doc('data').set({
                payload: JSON.stringify(data),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Cloud Synced: ${collection}`);
        } catch (e) {
            console.error("Cloud Sync Error:", e);
        }
    },

    // Load data from cloud
    load: async function (collection) {
        const user = auth.currentUser;
        if (!user) return null;

        try {
            const doc = await db.collection('users').doc(user.email).collection(collection).doc('data').get();
            if (doc.exists) {
                return JSON.parse(doc.data().payload);
            }
        } catch (e) {
            console.error("Cloud Load Error:", e);
        }
        return null;
    }
};

window.CloudSync = CloudSync;
