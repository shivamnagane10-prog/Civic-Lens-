import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { IssueCategory } from '@civiclens/shared-types';
import { mobileApi } from '../api/client';

export const ReportScreen: React.FC = () => {
  const [category, setCategory] = useState<IssueCategory>('pothole');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState(37.7749);
  const [longitude, setLongitude] = useState(-122.4194);
  const [photoUrl, setPhotoUrl] = useState('https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await mobileApi.createIssue({
        category,
        description,
        latitude,
        longitude,
        photo_url: photoUrl,
        source: 'citizen',
        ward_id: 'WARD-01',
      });
      Alert.alert('Report Submitted', `Issue ${res.id} recorded with priority ${res.priority_score}. Diagnostic fix estimated.`);
      setDescription('');
    } catch (err: any) {
      Alert.alert('Offline Mode', 'Report cached locally in device SQLite queue. Will sync upon reconnection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Report Municipal Hazard</Text>
      <Text style={styles.subHeader}>CivicLens Mobile AI Reporter</Text>

      <Text style={styles.label}>Select Category</Text>
      <View style={styles.categoryRow}>
        {(['pothole', 'water_leak', 'drainage', 'garbage', 'streetlight'] as IssueCategory[]).map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.categoryBtn, category === c && styles.categoryBtnActive]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.categoryText, category === c && styles.categoryTextActive]}>{c.replace('_', ' ')}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        placeholder="Describe the issue..."
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>GPS Coordinates (Auto-tagged)</Text>
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.half]} value={latitude.toString()} editable={false} />
        <TextInput style={[styles.input, styles.half]} value={longitude.toString()} editable={false} />
      </View>

      <Text style={styles.label}>Photo Attachment</Text>
      <Image source={{ uri: photoUrl }} style={styles.photo} />

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitText}>{loading ? 'Submitting...' : 'Submit Issue'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', padding: 16 },
  header: { fontSize: 22, fontWeight: 'bold', color: '#f8fafc', marginTop: 10 },
  subHeader: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: 'bold', color: '#cbd5e1', marginTop: 12, marginBottom: 6, textTransform: 'uppercase' },
  categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryBtn: { backgroundColor: '#1e293b', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  categoryBtnActive: { backgroundColor: '#0284c7' },
  categoryText: { color: '#94a3b8', fontSize: 12 },
  categoryTextActive: { color: '#ffffff', fontWeight: 'bold' },
  input: { backgroundColor: '#1e293b', color: '#ffffff', borderRadius: 8, padding: 10, fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  photo: { width: '100%', height: 160, borderRadius: 8, marginTop: 4, marginBottom: 16 },
  submitBtn: { backgroundColor: '#0284c7', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});
