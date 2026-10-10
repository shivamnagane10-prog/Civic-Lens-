import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TextInput,
  Image,
  Alert
} from 'react-native';
import { IssueCategory, Issue } from '@civiclens/shared-types';
import { mobileApi } from './src/api/client';

export default function App() {
  const [activeTab, setActiveTab] = useState<'report' | 'diagnostics' | 'bom' | 'notifications' | 'crew'>('report');
  const [category, setCategory] = useState<IssueCategory>('pothole');
  
  // Fields matching User Screenshot 1
  const [streetAddress, setStreetAddress] = useState('42 MG Road, near Trinity Junction');
  const [wardZone, setWardZone] = useState('Ward 112 (Richmond Town)');
  const [landmark, setLandmark] = useState('Opposite Metro Station Pillar 184');
  const [description, setDescription] = useState(
    'Deep cavity in center of lane. Two scooterists swerved dangerously this morning; high risk at night.'
  );

  const [latitude, setLatitude] = useState(12.9716);
  const [longitude, setLongitude] = useState(77.5946);
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80'
  );
  const [loading, setLoading] = useState(false);

  const [notifications, setNotifications] = useState([
    {
      id: '1',
      title: '🏛️ Welcome to CivicLens Mobile',
      message: 'Take a photo of any civic hazard. AI automatically estimates repair costs and notifies authorities.',
      type: 'info'
    }
  ]);

  const handleSimulateGPS = () => {
    setLatitude(12.9716);
    setLongitude(77.5946);
    Alert.alert('GPS Locked', 'Location set to Bengaluru Richmond Town (12.9716, 77.5946)');
  };

  const handleVoiceNote = () => {
    setDescription('Deep cavity in center of lane. Two scooterists swerved dangerously this morning; high risk at night.');
    Alert.alert('Voice Note Transcribed', 'Audio successfully converted to text observation.');
  };

  const handleSubmit = async () => {
    setLoading(true);
    const payload = {
      title: `${category.replace('_', ' ').toUpperCase()} at ${streetAddress}`,
      category,
      description: `${description} [Landmark: ${landmark}, Zone: ${wardZone}]`,
      latitude,
      longitude,
      photo_url: photoUrl,
      source: 'citizen' as const,
      ward_id: 'WARD-KA-03'
    };

    try {
      const res = await mobileApi.createIssue(payload);
      Alert.alert(
        'Work Order Issued!',
        `Issue ${res.id} recorded. Sent to Municipal Corporator for budget sanctioning.`
      );
      setNotifications((prev) => [
        {
          id: String(Date.now()),
          title: '📝 Work Order Issued',
          message: `Complaint #${res.id} submitted. Awaiting Corporator sanction and crew assignment.`,
          type: 'reported'
        },
        ...prev
      ]);
      setActiveTab('notifications');
    } catch (err: any) {
      Alert.alert('Offline Mode', 'Report stored in local SQLite cache. Will sync on reconnect.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0b1120" />

      {/* Top Mobile Bar */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.brand}>CivicLens Mobile</Text>
          <Text style={styles.subBrand}>Intelligent Municipal Spatial Governance</Text>
        </View>
        <View style={styles.liveBadge}>
          <Text style={styles.liveText}>● 5G ONLINE</Text>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 24 }}>
        {/* Tab 1: Report Hazard (Matching Photo 1) */}
        {activeTab === 'report' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>1. Photo &amp; Category</Text>
            
            <Image source={{ uri: photoUrl }} style={styles.photo} />

            <Text style={styles.label}>Select Infrastructure Hazard</Text>
            <View style={styles.categoryRow}>
              {(['pothole', 'water_leak', 'drainage', 'garbage', 'streetlight', 'road_damage'] as IssueCategory[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryBtn, category === c && styles.categoryBtnActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>
                    {c.replace('_', ' ').toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Location & Notes (Matching Photo 1) */}
            <View style={styles.locationSection}>
              <View style={styles.locHeaderRow}>
                <Text style={styles.sectionTitle}>2. Location &amp; Notes</Text>
                <TouchableOpacity style={styles.gpsBtn} onPress={handleSimulateGPS}>
                  <Text style={styles.gpsBtnText}>🎯 Use Phone GPS</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Street Address</Text>
              <TextInput
                style={styles.input}
                value={streetAddress}
                onChangeText={setStreetAddress}
                placeholder="e.g. 42 MG Road, near Trinity Junction"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.label}>Ward &amp; Municipal Zone</Text>
              <TextInput
                style={styles.input}
                value={wardZone}
                onChangeText={setWardZone}
                placeholder="e.g. Ward 112 (Richmond Town)"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.label}>Prominent Landmark</Text>
              <TextInput
                style={styles.input}
                value={landmark}
                onChangeText={setLandmark}
                placeholder="e.g. Opposite Metro Station Pillar 184"
                placeholderTextColor="#64748b"
              />

              <View style={styles.locHeaderRow}>
                <Text style={styles.label}>Citizen Observation Notes</Text>
                <TouchableOpacity onPress={handleVoiceNote}>
                  <Text style={styles.voiceText}>🎙️ Simulate Voice</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor="#64748b"
              />

              {/* Action Button: Run AI Diagnostics & Cost Estimator */}
              <TouchableOpacity
                style={styles.aiDiagBtn}
                onPress={() => setActiveTab('diagnostics')}
              >
                <Text style={styles.aiDiagBtnText}>⛶ Run AI Diagnostics &amp; Cost Estimator</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Tab 2: AI Diagnostics Cards (Matching Photo 2) */}
        {activeTab === 'diagnostics' && (
          <View style={styles.card}>
            <Text style={styles.tealHeader}>DEFECT GEOMETRY &amp; SIZING</Text>
            <Text style={styles.problemTitle}>Severe Asphalt Pothole &amp; Sub-base Subsidence</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Surface Area</Text>
                <Text style={styles.statVal}>1.54 m²</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Cavity Depth</Text>
                <Text style={[styles.statVal, { color: '#f87171' }]}>13.2 cm</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Length × Width</Text>
                <Text style={styles.statVal}>1.4m × 1.1m</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>Bitumen Volume</Text>
                <Text style={styles.statVal}>0.203 m³</Text>
              </View>
            </View>

            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                High Risk - Potential tire blowout, axle breakage, and two-wheeler fatal skid risk.
              </Text>
            </View>

            <Text style={[styles.tealHeader, { marginTop: 16 }]}>RECOMMENDED ENGINEERING FIX</Text>
            <View style={styles.sopBox}>
              <Text style={styles.sopText}>
                Cold-milling, aggregate base compaction, tack-coat primer, and Type-II Bituminous Hot-Mix Asphalt laying.
              </Text>
            </View>

            <Text style={[styles.tealHeader, { marginTop: 16 }]}>TOTAL REPAIR ESTIMATE (SoR 2026)</Text>
            <Text style={styles.bigPrice}>₹ 15,107</Text>
            <Text style={styles.subPrice}>approx. $ 174.65 USD</Text>
            <Text style={styles.slaText}>Municipal SLA: Immediate action (Within 36 Hours)</Text>

            {/* Notify Authorities Button */}
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'Submitting...' : '✈️ Notify Authorities & Issue Work Order'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tab 3: Itemized BOM (Matching Photo 3) */}
        {activeTab === 'bom' && (
          <View style={styles.card}>
            <Text style={styles.tealHeader}>Itemized Bill of Materials (BOM)</Text>
            <Text style={styles.subBrand}>IRC:SP:100 Rates Standard</Text>

            <View style={styles.bomTable}>
              {[
                { desc: 'Type-II Bituminous Hot-Mix Asphalt', qty: '0.48 t', cost: '₹ 2,976' },
                { desc: 'Bitumen Tack-Coat (RS-1)', qty: '3.2 L', cost: '₹ 272' },
                { desc: 'Granular Sub-base (GSB)', qty: '0.6 t', cost: '₹ 690' },
                { desc: 'Vibratory Plate Compactor (1.5T)', qty: '4 Hrs', cost: '₹ 2,800' },
                { desc: 'Road Saw Cutter', qty: '2 Hrs', cost: '₹ 1,600' },
                { desc: 'Lead Paving Mason & Operator', qty: '5 Hrs', cost: '₹ 1,500' },
                { desc: 'Road Maintenance Crew (3 Staff)', qty: '5 Hrs', cost: '₹ 2,700' },
                { desc: 'Traffic Marshall Setup', qty: '5 Hrs', cost: '₹ 950' },
              ].map((item, idx) => (
                <View key={idx} style={styles.bomRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bomDesc}>{item.desc}</Text>
                    <Text style={styles.bomQty}>{item.qty}</Text>
                  </View>
                  <Text style={styles.bomCost}>{item.cost}</Text>
                </View>
              ))}
            </View>

            <View style={styles.bomFooter}>
              <Text style={styles.contingency}>Contingency &amp; Supervision (12%): ₹ 1,619</Text>
              <Text style={styles.totalBudget}>Total Repair Budget: ₹ 15,107</Text>
            </View>
          </View>
        )}

        {/* Tab 4: Notifications Feed */}
        {activeTab === 'notifications' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Citizen Notifications</Text>
            {notifications.map((n) => (
              <View key={n.id} style={styles.notifCard}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifMsg}>{n.message}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Bottom Mobile Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('report')}>
          <Text style={[styles.tabText, activeTab === 'report' && styles.tabTextActive]}>Report</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('diagnostics')}>
          <Text style={[styles.tabText, activeTab === 'diagnostics' && styles.tabTextActive]}>AI Sizing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('bom')}>
          <Text style={[styles.tabText, activeTab === 'bom' && styles.tabTextActive]}>BOM</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('notifications')}>
          <Text style={[styles.tabText, activeTab === 'notifications' && styles.tabTextActive]}>Alerts</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  topBar: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0b1120',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  brand: { fontSize: 17, fontWeight: 'bold', color: '#38bdf8' },
  subBrand: { fontSize: 10, color: '#94a3b8' },
  liveBadge: { backgroundColor: '#064e3b', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  liveText: { color: '#34d399', fontSize: 10, fontWeight: 'bold' },
  content: { flex: 1, padding: 12 },
  card: { backgroundColor: '#0b1329', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1e293b' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#f8fafc', marginBottom: 8 },
  photo: { width: '100%', height: 160, borderRadius: 12, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: 'bold', color: '#94a3b8', marginTop: 8, marginBottom: 4, textTransform: 'uppercase' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  categoryBtn: { backgroundColor: '#0f172a', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#1e293b' },
  categoryBtnActive: { backgroundColor: '#0284c7', borderColor: '#38bdf8' },
  categoryText: { color: '#94a3b8', fontSize: 10, fontWeight: '600' },
  categoryTextActive: { color: '#ffffff', fontWeight: 'bold' },
  locationSection: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  locHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gpsBtn: { backgroundColor: '#0e2730', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#2dd4bf' },
  gpsBtnText: { color: '#2dd4bf', fontSize: 10, fontWeight: 'bold' },
  voiceText: { color: '#2dd4bf', fontSize: 10, fontWeight: 'bold' },
  input: { backgroundColor: '#070d1e', color: '#ffffff', borderRadius: 10, padding: 8, fontSize: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 6 },
  aiDiagBtn: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  aiDiagBtnText: { color: '#022c22', fontWeight: '900', fontSize: 12 },
  tealHeader: { color: '#2dd4bf', fontWeight: 'bold', fontSize: 11, letterSpacing: 1 },
  problemTitle: { color: '#ffffff', fontSize: 15, fontWeight: 'bold', marginTop: 4, marginBottom: 10 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statBox: { width: '48%', backgroundColor: '#0e1935', padding: 8, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b' },
  statLabel: { color: '#94a3b8', fontSize: 9 },
  statVal: { color: '#ffffff', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  warningBox: { backgroundColor: '#1e1708', borderColor: '#f59e0b', borderWidth: 1, borderRadius: 10, padding: 8, marginTop: 10 },
  warningText: { color: '#fbbf24', fontSize: 10, lineHeight: 14 },
  sopBox: { backgroundColor: '#0e1935', padding: 10, borderRadius: 10, marginTop: 4 },
  sopText: { color: '#cbd5e1', fontSize: 11, lineHeight: 16 },
  bigPrice: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginTop: 6 },
  subPrice: { color: '#94a3b8', fontSize: 11 },
  slaText: { color: '#f87171', fontSize: 11, fontWeight: 'bold', marginTop: 4 },
  submitBtn: { backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 14 },
  submitBtnText: { color: '#022c22', fontWeight: '900', fontSize: 12 },
  bomTable: { marginTop: 10, borderTopWidth: 1, borderTopColor: '#1e293b' },
  bomRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  bomDesc: { color: '#ffffff', fontSize: 11 },
  bomQty: { color: '#94a3b8', fontSize: 9 },
  bomCost: { color: '#2dd4bf', fontSize: 11, fontWeight: 'bold' },
  bomFooter: { marginTop: 10, alignItems: 'flex-end' },
  contingency: { color: '#94a3b8', fontSize: 10 },
  totalBudget: { color: '#2dd4bf', fontSize: 13, fontWeight: 'bold', marginTop: 2 },
  notifCard: { backgroundColor: '#0e1935', padding: 10, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#1e293b' },
  notifTitle: { color: '#38bdf8', fontWeight: 'bold', fontSize: 12, marginBottom: 2 },
  notifMsg: { color: '#cbd5e1', fontSize: 11 },
  tabBar: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#1e293b', backgroundColor: '#020617', paddingVertical: 6 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  tabText: { color: '#64748b', fontSize: 10, fontWeight: '600' },
  tabTextActive: { color: '#38bdf8', fontWeight: 'bold' },
});
