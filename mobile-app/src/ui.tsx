import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { theme } from './theme';

export function Button({ title, onPress, secondary, disabled }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean;
}) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
    style={[styles.button, secondary && styles.secondary, disabled && { opacity: 0.5 }]}>
    {disabled ? <ActivityIndicator color={theme.bg} /> : <Text style={[styles.buttonText, secondary && { color: theme.text }]}>{title}</Text>}
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (value: string) => void; placeholder?: string;
  secureTextEntry?: boolean; keyboardType?: 'default' | 'email-address' | 'decimal-pad'; multiline?: boolean;
}) {
  return <View style={{ marginBottom: 18 }}>
    <Text style={styles.label}>{label.toUpperCase()}</Text>
    <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder}
      placeholderTextColor="#777" secureTextEntry={secureTextEntry} keyboardType={keyboardType}
      multiline={multiline} autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
      style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }]} />
  </View>;
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return <View style={{ marginBottom: 24 }}>
    <Text style={styles.eyebrow}>{eyebrow.toUpperCase()}</Text>
    <Text style={styles.title}>{title.toUpperCase()}</Text>
    {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
  </View>;
}

export function Message({ text, error }: { text: string; error?: boolean }) {
  return <View style={[styles.message, error && { borderColor: theme.red }]}>
    <Text style={{ color: error ? '#ff9696' : theme.lime }}>{text}</Text>
  </View>;
}

const styles = StyleSheet.create({
  button: { backgroundColor: theme.lime, padding: 16, minHeight: 52, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  secondary: { backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line },
  buttonText: { color: theme.bg, fontSize: 15, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
  label: { color: theme.muted, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  input: { backgroundColor: theme.panel, borderWidth: 1, borderColor: theme.line, color: theme.text, minHeight: 52, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  eyebrow: { color: theme.lime, fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  title: { color: theme.text, fontSize: 32, fontWeight: '900', lineHeight: 35 },
  subtitle: { color: theme.muted, fontSize: 14, lineHeight: 21, marginTop: 12 },
  message: { borderWidth: 1, borderColor: theme.lime, padding: 14, marginBottom: 20 },
});
