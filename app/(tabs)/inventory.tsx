import React, { useState, useCallback, useEffect } from 'react';
import {
  FlatList,
  Alert,
  Platform,
  TouchableOpacity,
  RefreshControl,
  TextInput as RNTextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  Card,
  Button,
  H4,
  SizableText,
  Spinner,
  Input,
  Sheet,
  toast,
  BlinkSelect,
  EmptyState,
} from '@blinkdotnew/mobile-ui';
import {
  Package,
  Search,
  Trash2,
  Download,
  Edit3,
  Filter,
  X,
  Barcode,
  Store,
  Calendar,
  Ruler,
  ChevronRight,
  RefreshCw,
} from '@tamagui/lucide-icons';
import {
  getAllLabels,
  deleteLabel,
  searchLabels,
  filterLabelsByStore,
  getStores,
  initDatabase,
  type LabelRecord,
} from '@/lib/database';

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr.replace(' ', 'T'));
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 60) return `Hace ${diffMin}min`;
  if (diffHrs < 24) return `Hace ${diffHrs}h`;
  if (diffDays < 7) return `Hace ${diffDays}d`;

  return d.toLocaleDateString('es-EC', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function InventoryScreen() {
  const router = useRouter();

  const [labels, setLabels] = useState<LabelRecord[]>([]);
  const [filteredLabels, setFilteredLabels] = useState<LabelRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const [stores, setStores] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<LabelRecord | null>(null);
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    const setup = async () => {
      try {
        await initDatabase();
        setDbReady(true);
        await loadData();
      } catch (error: any) {
        console.error('DB init error:', error);
      }
    };
    setup();
  }, []);

  const loadData = async () => {
    try {
      const [allLabels, allStores] = await Promise.all([getAllLabels(), getStores()]);
      setLabels(allLabels);
      setStores(allStores);
      applyFilters(allLabels, searchQuery, selectedStore);
    } catch (error: any) {
      console.error('Load error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const applyFilters = (items: LabelRecord[], query: string, store: string | null) => {
    let result = items;
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.store.toLowerCase().includes(q) ||
          l.barcode.includes(q)
      );
    }
    if (store) {
      result = result.filter((l) => l.store === store);
    }
    setFilteredLabels(result);
  };

  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query);
      applyFilters(labels, query, selectedStore);
    },
    [labels, selectedStore]
  );

  const handleStoreFilter = useCallback(
    (store: string | null) => {
      setSelectedStore(store);
      applyFilters(labels, searchQuery, store);
    },
    [labels, searchQuery]
  );

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
  };

  const handleDelete = async (label: LabelRecord) => {
    try {
      await deleteLabel(label.id);
      const updated = labels.filter((l) => l.id !== label.id);
      setLabels(updated);
      applyFilters(updated, searchQuery, selectedStore);
      toast('Etiqueta eliminada', { variant: 'success' });
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo eliminar');
    }
    setShowDeleteConfirm(null);
  };

  const handleEdit = (label: LabelRecord) => {
    router.push({
      pathname: '/label/[id]',
      params: { id: label.id.toString() },
    });
  };

  const renderLabelCard = ({ item }: { item: LabelRecord }) => {
    let textFields: any[] = [];
    try {
      textFields = JSON.parse(item.textFields || '[]');
    } catch {}

    return (
      <Card bordered marginBottom="$3" overflow="hidden">
        <Card.Header padded>
          <YStack gap="$3">
            {/* Product name + price */}
            <XStack justifyContent="space-between" alignItems="flex-start">
              <YStack flex={1} gap="$1">
                <XStack alignItems="center" gap="$2">
                  <SizableText fontWeight="700" size="$4" color="#16213e" numberOfLines={1}>
                    {item.name}
                  </SizableText>
                </XStack>
                {textFields
                  .filter((f: any) => f.text.startsWith('$'))
                  .map((f: any, i: number) => (
                    <SizableText key={i} size="$6" fontWeight="800" color="#e94560">
                      {f.text}
                    </SizableText>
                  ))}
              </YStack>

              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(item)}
                style={{ padding: 6 }}
              >
                <Trash2 size={18} color="#94a3b8" />
              </TouchableOpacity>
            </XStack>

            {/* Metadata row */}
            <XStack flexWrap="wrap" gap="$2">
              {item.store ? (
                <XStack
                  backgroundColor="#f1f5f9"
                  paddingHorizontal="$2"
                  paddingVertical="$1"
                  borderRadius="$2"
                  alignItems="center"
                  gap="$1"
                >
                  <Store size={12} color="#64748b" />
                  <SizableText size="$1" color="#64748b">
                    {item.store}
                  </SizableText>
                </XStack>
              ) : null}

              <XStack
                backgroundColor="#f1f5f9"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                alignItems="center"
                gap="$1"
              >
                <Barcode size={12} color="#64748b" />
                <SizableText size="$1" color="#64748b">
                  {item.barcode}
                </SizableText>
              </XStack>

              <XStack
                backgroundColor="#f1f5f9"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$2"
                alignItems="center"
                gap="$1"
              >
                <Calendar size={12} color="#64748b" />
                <SizableText size="$1" color="#64748b">
                  {formatDateTime(item.createdAt)}
                </SizableText>
              </XStack>
            </XStack>

            {/* Dimensions */}
            <XStack alignItems="center" gap="$1">
              <Ruler size={12} color="#94a3b8" />
              <SizableText size="$1" color="#94a3b8">
                {item.widthCm}cm x {item.heightCm}cm
              </SizableText>
              <SizableText size="$1" color="#94a3b8">
                | {item.barcodeType}
              </SizableText>
            </XStack>

            {/* Label mini preview */}
            <YStack
              backgroundColor="#fafafa"
              borderWidth={1}
              borderColor="#e2e8f0"
              borderRadius="$3"
              padding="$2"
            >
              {textFields.slice(0, 3).map((field: any, i: number) => (
                <SizableText
                  key={i}
                  size="$1"
                  color={field.color || '#1a1a2e'}
                  fontWeight={field.text?.startsWith('$') ? '800' : '600'}
                  numberOfLines={1}
                >
                  {field.text}
                </SizableText>
              ))}
              <XStack
                backgroundColor="#f1f5f9"
                marginTop="$1"
                padding="$1"
                borderRadius="$1"
                justifyContent="center"
              >
                <SizableText size="$1" color="#475569" fontFamily="monospace">
                  {item.barcode}
                </SizableText>
              </XStack>
            </YStack>
          </YStack>
        </Card.Header>

        {/* Actions */}
        <YStack
          borderTopWidth={1}
          borderTopColor="$color5"
          paddingHorizontal="$4"
          paddingVertical="$2"
        >
          <XStack gap="$2">
            <TouchableOpacity
              onPress={() => handleEdit(item)}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                backgroundColor: '#16213e',
                borderRadius: 8,
                gap: 6,
              }}
            >
              <Edit3 size={14} color="#fff" />
              <SizableText size="$2" color="#fff" fontWeight="600">
                Editar
              </SizableText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                router.push({
                  pathname: '/label/[id]',
                  params: { id: item.id.toString(), export: '1' },
                });
              }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 10,
                backgroundColor: '#16a34a',
                borderRadius: 8,
                gap: 6,
              }}
            >
              <Download size={14} color="#fff" />
              <SizableText size="$2" color="#fff" fontWeight="600">
                Exportar
              </SizableText>
            </TouchableOpacity>
          </XStack>
        </YStack>
      </Card>
    );
  };

  if (!dbReady) {
    return (
      <YStack flex={1} backgroundColor="#f8fafc" justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <SizableText marginTop="$3" color="$color10">
          Cargando inventario...
        </SizableText>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#f8fafc">
      {/* Header */}
      <YStack
        paddingTop={Platform.OS === 'ios' ? 55 : 30}
        paddingHorizontal="$4"
        paddingBottom="$3"
        backgroundColor="#16213e"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$2">
            <Package size={22} color="#fff" />
            <H4 color="#fff">Inventario</H4>
          </XStack>
          <SizableText size="$2" color="rgba(255,255,255,0.6)">
            {filteredLabels.length} artículos
          </SizableText>
        </XStack>
      </YStack>

      {/* Search + Filter */}
      <YStack paddingHorizontal="$4" paddingTop="$3" backgroundColor="#fff" paddingBottom="$2">
        <XStack gap="$2">
          <YStack flex={1}>
            <Input
              placeholder="Buscar por nombre, tienda o código..."
              value={searchQuery}
              onChangeText={handleSearch}
              leftIcon={<Search size={16} color="#94a3b8" />}
            />
          </YStack>
        </XStack>

        {stores.length > 0 && (
          <XStack gap="$2" marginTop="$2">
            {selectedStore && (
              <TouchableOpacity
                onPress={() => handleStoreFilter(null)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: '#16213e',
                  borderRadius: 20,
                  gap: 4,
                }}
              >
                <X size={12} color="#fff" />
                <SizableText size="$1" color="#fff">
                  {selectedStore}
                </SizableText>
              </TouchableOpacity>
            )}
            {stores.slice(0, 4).map((store) => (
              <TouchableOpacity
                key={store}
                onPress={() =>
                  handleStoreFilter(selectedStore === store ? null : store)
                }
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  backgroundColor: selectedStore === store ? '#16213e' : '#f1f5f9',
                  borderRadius: 20,
                }}
              >
                <SizableText
                  size="$1"
                  color={selectedStore === store ? '#fff' : '#475569'}
                  fontWeight={selectedStore === store ? '600' : '400'}
                >
                  {store}
                </SizableText>
              </TouchableOpacity>
            ))}
          </XStack>
        )}
      </YStack>

      {/* Labels List */}
      {isLoading ? (
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
        </YStack>
      ) : (
        <FlatList
          data={filteredLabels}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderLabelCard}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: Platform.OS === 'ios' ? 40 : 20,
            flexGrow: 1,
          }}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <YStack flex={1} justifyContent="center" alignItems="center" padding="$5">
              <Package size={64} color="#94a3b8" />
              <SizableText
                marginTop="$4"
                size="$5"
                fontWeight="600"
                color="#475569"
                textAlign="center"
              >
                {searchQuery || selectedStore
                  ? 'Sin resultados'
                  : 'Inventario vacío'}
              </SizableText>
              <SizableText marginTop="$2" color="$color10" textAlign="center">
                {searchQuery || selectedStore
                  ? 'Intenta con otra búsqueda o filtro'
                  : 'Escanea tu primera etiqueta para empezar'}
              </SizableText>
              {!searchQuery && !selectedStore && (
                <Button
                  theme="active"
                  marginTop="$4"
                  onPress={() => router.push('/(tabs)/scanner')}
                >
                  Escanear Etiqueta
                </Button>
              )}
            </YStack>
          }
        />
      )}

      {/* Delete Confirmation Sheet */}
      <Sheet
        open={!!showDeleteConfirm}
        onOpenChange={(v) => !v && setShowDeleteConfirm(null)}
        snapPoints={[30]}
        dismissOnSnapToBottom
      >
        <YStack padding="$4" gap="$4" alignItems="center">
          <Trash2 size={40} color="#ef4444" />
          <H4>Eliminar Etiqueta</H4>
          <SizableText textAlign="center" color="$color10">
            ¿Eliminar "{showDeleteConfirm?.name}"? Esta acción no se puede deshacer.
          </SizableText>
          <XStack gap="$3" width="100%">
            <Button
              flex={1}
              variant="outlined"
              onPress={() => setShowDeleteConfirm(null)}
            >
              Cancelar
            </Button>
            <Button
              flex={1}
              backgroundColor="#ef4444"
              onPress={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
            >
              <Trash2 size={14} color="#fff" />
              <SizableText color="#fff" marginLeft="$2">Eliminar</SizableText>
            </Button>
          </XStack>
        </YStack>
      </Sheet>
    </YStack>
  );
}
