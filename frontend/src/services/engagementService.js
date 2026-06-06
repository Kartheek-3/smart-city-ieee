import { db } from './firebase';
import { collection, doc, getDoc, getDocs, updateDoc, query, orderBy, limit, increment } from 'firebase/firestore';

// ── Trust & Engagement System ──

export const updateCitizenTrust = async (userId, change) => {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    let newScore = (snap.data().trustScore || 100) + change;
    if (newScore > 100) newScore = 100;
    if (newScore < 0) newScore = 0;
    await updateDoc(userRef, { trustScore: newScore });
  }
};

export const awardCivicPoints = async (userId, points, actionDesc) => {
  if (!userId) return;
  const userRef = doc(db, 'users', userId);
  const snap = await getDoc(userRef);
  
  if (snap.exists()) {
    const data = snap.data();
    let currentPoints = data.civicPoints || 0;
    let badges = data.badges || [];
    
    currentPoints += points;

    // Badge Logic
    if (currentPoints >= 100 && !badges.includes('Civic Starter')) badges.push('Civic Starter');
    if (currentPoints >= 500 && !badges.includes('Community Hero')) badges.push('Community Hero');
    if (currentPoints >= 1000 && !badges.includes('Smart City Legend')) badges.push('Smart City Legend');

    await updateDoc(userRef, { civicPoints: currentPoints, badges });
  }
};

export const getLeaderboard = async () => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('civicPoints', 'desc'), limit(10));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export const getCommunityMissions = () => {
  // Static for now, could be dynamic from DB
  return [
    { id: 'm1', title: 'Waste Warrior', description: 'Validate 5 open waste reports in your neighborhood.', reward: 50, progress: 0, target: 5 },
    { id: 'm2', title: 'Safe Streets', description: 'Report a traffic hazard or accident.', reward: 100, progress: 0, target: 1 },
    { id: 'm3', title: 'Vigilant Citizen', description: 'Maintain a 100 Trust Score for a full week.', reward: 200, progress: 1, target: 1 },
  ];
};
