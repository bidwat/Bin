import { Actionability, ItemType } from '@bin/shared';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type FeedFilterDrawerProps = {
  selectedType: ItemType | null;
  selectedActionability: Actionability | null;
  onSelectType: (type: ItemType | null) => void;
  onSelectActionability: (actionability: Actionability | null) => void;
  onClose: () => void;
  visible: boolean;
};

export function FeedFilterDrawer({
  selectedType,
  selectedActionability,
  onSelectType,
  onSelectActionability,
  onClose,
  visible,
}: FeedFilterDrawerProps) {
  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.scrim} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filter feed</Text>
            <Pressable onPress={onClose}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Type</Text>
              <View style={styles.pills}>
                <Pill
                  active={selectedType === null}
                  label="All"
                  onPress={() => onSelectType(null)}
                />
                {Object.values(ItemType).map((value) => (
                  <Pill
                    key={value}
                    active={selectedType === value}
                    label={`${value[0]?.toUpperCase()}${value.slice(1)}`}
                    onPress={() => onSelectType(value)}
                  />
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Actionability</Text>
              <View style={styles.pills}>
                <Pill
                  active={selectedActionability === null}
                  label="All"
                  onPress={() => onSelectActionability(null)}
                />
                {Object.values(Actionability).map((value) => (
                  <Pill
                    key={value}
                    active={selectedActionability === value}
                    label={`${value[0]?.toUpperCase()}${value.slice(1)}`}
                    onPress={() => onSelectActionability(value)}
                  />
                ))}
              </View>
            </View>

            <Pressable
              style={styles.resetButton}
              onPress={() => {
                onSelectType(null);
                onSelectActionability(null);
              }}
            >
              <Text style={styles.resetButtonText}>Clear filters</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Pill({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.pill, active ? styles.pillActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, active ? styles.pillTextActive : null]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(15, 23, 42, 0.2)',
  },
  scrim: {
    flex: 1,
  },
  sheet: {
    maxHeight: '72%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 28,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#cbd5e1',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
  },
  close: {
    color: '#0f172a',
    fontWeight: '700',
  },
  content: {
    gap: 20,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    borderRadius: 999,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  pillActive: {
    backgroundColor: '#0f172a',
    borderColor: '#0f172a',
  },
  pillText: {
    color: '#334155',
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#ffffff',
  },
  resetButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  resetButtonText: {
    color: '#0f172a',
    fontWeight: '700',
  },
});
