import React, { useState, useEffect, useRef } from 'react';
import {
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import {
  YStack,
  XStack,
  Card,
  Button,
  H4,
  Paragraph,
  SizableText,
  Input,
  Spinner,
  toast,
} from '@blinkdotnew/mobile-ui';
import {
  Download,
  ArrowLeft,
  Save,
  Edit3,
  Barcode,
  Ruler,
  RefreshCw,
  Store,
  Trash2,
} from '@tamagui/lucide-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { getLabelById, updateLabel, deleteLabel, type LabelRecord } from '@/lib/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LABEL_CANVAS_W = SCREEN_WIDTH - 48;
const LABEL_ASPECT_RATIO = 3 / 5;

export default function LabelDetailScreen() {
  const { id, export: shouldExport } = useLocalSearchParams<{ id: string; export?: string }>();
  const router = useRouter();
  const viewShotRef = useRef<ViewShot>(null);

  const [label, setLabel] = useState<LabelRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Editable fields
  const [editName, setEditName] = useState('');
  const [editStore, setEditStore] = useState('');
  const [editBarcode, setEditBarcode] = useState('');
  const [editWidthCm, setEditWidthCm] = useState('');
  const [editHeightCm, setEditHeightCm] = useState('');
  const [editTextFields, setEditTextFields] = useState('');

  useEffect(() => {
    loadLabel();
  }, [id]);

  const loadLabel = async () => {
    setIsLoading(true);
    try {
      const data = await getLabelById(Number(id));
      setLabel(data);
      if (data) {
        setEditName(data.name);
        setEditStore(data.store);
        setEditBarcode(data.barcode);
        setEditWidthCm(data.widthCm.toString());
        setEditHeightCm(data.heightCm.toString());
        setEditTextFields(data.textFields);
      }
    } catch (error: any) {
      Alert.alert('Error', 'No se pudo cargar la etiqueta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!label) return;
    try {
      await updateLabel(label.id, {
        name: editName,
        store: editStore,
        barcode: editBarcode,
        widthCm: +editWidthCm || label.widthCm,
        heightCm: +editHeightCm || label.heightCm,
        textFields: editTextFields,
      });
      toast('Etiqueta actualizada', { variant: 'success' });
      setIsEditing(false);
      await loadLabel();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar');
    }
  };

  const handleExport = async () => {
    if (!label) return;
    if (Platform.OS === 'web') {
      toast('Exportación no disponible en web', { variant: 'error' });
      return;
    }

    setIsExporting(true);
    try {
      const dpi = 300;
      const cmToInch = 0.393701;
      const pixelWidth = Math.round(label.widthCm * cmToInch * dpi);
      const pixelHeight = Math.round(label.heightCm * cmToInch * dpi);

      if (viewShotRef.current && (viewShotRef.current as any).capture) {
        const uri = await (viewShotRef.current as any).capture({
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `${label.name} (${pixelWidth}x${pixelHeight}px @ 300 DPI)`,
            UTI: 'public.png',
          });
        }
        toast('Etiqueta exportada', { variant: 'success' });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo exportar');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!label) return;
    Alert.alert(
      'Eliminar Etiqueta',
      `¿Eliminar "${label.name}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteLabel(label.id);
              toast('Etiqueta eliminada', { variant: 'success' });
              router.back();
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <YStack flex={1} backgroundColor="#f8fafc" justifyContent="center" alignItems="center">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!label) {
    return (
      <YStack flex={1} backgroundColor="#f8fafc" justifyContent="center" alignItems="center">
        <SizableText color="$color10">Etiqueta no encontrada</SizableText>
        <Button marginTop="$4" onPress={() => router.back()}>
          Volver
        </Button>
      </YStack>
    );
  }

  let textFields: any[] = [];
  try {
    textFields = JSON.parse(label.textFields || '[]');
  } catch {}

  const canvasW = LABEL_CANVAS_W;
  const canvasH = LABEL_CANVAS_W * LABEL_ASPECT_RATIO;

  return (
    <YStack flex={1} backgroundColor="#f8fafc">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Custom Header */}
      <YStack
        paddingTop={Platform.OS === 'ios' ? 55 : 30}
        paddingHorizontal="$4"
        paddingBottom="$3"
        backgroundColor="#16213e"
      >
        <XStack justifyContent="space-between" alignItems="center">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <H4 color="#fff">{isEditing ? 'Editando' : label.name}</H4>
          <XStack gap="$2">
            {isEditing ? (
              <TouchableOpacity onPress={handleSave}>
                <Save size={20} color="#fff" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Edit3 size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </XStack>
        </XStack>
      </YStack>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <YStack gap="$4">
          {/* Label Canvas Preview */}
          <Card bordered overflow="hidden">
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <YStack
                backgroundColor="#ffffff"
                width={canvasW}
                height={canvasH}
                alignSelf="center"
                position="relative"
              >
                {textFields.map((field: any, i: number) => (
                  <SizableText
                    key={i}
                    position="absolute"
                    left={(field.x / 100) * canvasW}
                    top={(field.y / 100) * canvasH}
                    style={{
                      fontSize: (field.fontSize / 14) * (canvasW / 20),
                      fontWeight: '700',
                      color: field.color || '#1a1a2e',
                    }}
                  >
                    {field.text}
                  </SizableText>
                ))}

                {/* Barcode area */}
                <YStack
                  position="absolute"
                  bottom={(10 / 100) * canvasH}
                  left={(10 / 100) * canvasW}
                  right={(10 / 100) * canvasW}
                  backgroundColor="#f1f5f9"
                  padding="$2"
                  borderRadius="$2"
                  alignItems="center"
                >
                  <SizableText fontFamily="monospace" size="$1" color="#475569">
                    ||| ||||| | |||| ||| | |||| ||| |
                  </SizableText>
                  <SizableText fontFamily="monospace" size="$1" color="#1e293b" fontWeight="600">
                    {label.barcode}
                  </SizableText>
                </YStack>

                <SizableText position="absolute" bottom={5} right={10} size="$1" color="#94a3b8">
                  {label.widthCm}cm x {label.heightCm}cm
                </SizableText>
              </YStack>
            </ViewShot>
          </Card>

          {/* Label Info */}
          {isEditing ? (
            <Card bordered>
              <Card.Header padded>
                <YStack gap="$3">
                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Nombre del Producto</SizableText>
                    <Input value={editName} onChangeText={setEditName} />
                  </YStack>
                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Tienda / Sucursal</SizableText>
                    <Input value={editStore} onChangeText={setEditStore} />
                  </YStack>
                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Código de Barras</SizableText>
                    <Input value={editBarcode} onChangeText={setEditBarcode} />
                  </YStack>
                  <XStack gap="$3">
                    <YStack flex={1} gap="$1">
                      <SizableText size="$2" color="$color10">Ancho (cm)</SizableText>
                      <Input value={editWidthCm} onChangeText={setEditWidthCm} keyboardType="decimal-pad" />
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <SizableText size="$2" color="$color10">Alto (cm)</SizableText>
                      <Input value={editHeightCm} onChangeText={setEditHeightCm} keyboardType="decimal-pad" />
                    </YStack>
                  </XStack>
                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Campos de Texto (JSON)</SizableText>
                    <Input
                      value={editTextFields}
                      onChangeText={setEditTextFields}
                      multiline
                      numberOfLines={4}
                    />
                  </YStack>
                </YStack>
              </Card.Header>
            </Card>
          ) : (
            <Card bordered>
              <Card.Header padded>
                <YStack gap="$3">
                  <XStack alignItems="center" gap="$2">
                    <Store size={16} color="#64748b" />
                    <SizableText color="#475569">
                      {label.store || 'Sin tienda'}
                    </SizableText>
                  </XStack>
                  <XStack alignItems="center" gap="$2">
                    <Barcode size={16} color="#64748b" />
                    <SizableText color="#475569" fontFamily="monospace">
                      {label.barcode}
                    </SizableText>
                    <SizableText size="$1" color="#94a3b8">
                      ({label.barcodeType})
                    </SizableText>
                  </XStack>
                  <XStack alignItems="center" gap="$2">
                    <Ruler size={16} color="#64748b" />
                    <SizableText color="#475569">
                      {label.widthCm}cm x {label.heightCm}cm
                    </SizableText>
                    <SizableText size="$1" color="#94a3b8">
                      @ 300 DPI: {Math.round(label.widthCm * 0.393701 * 300)}x{Math.round(label.heightCm * 0.393701 * 300)}px
                    </SizableText>
                  </XStack>
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Text fields info */}
          {!isEditing && textFields.length > 0 && (
            <Card bordered>
              <Card.Header padded>
                <SizableText fontWeight="600" marginBottom="$3" color="#16213e">
                  Campos de Texto ({textFields.length})
                </SizableText>
                {textFields.map((field: any, i: number) => (
                  <XStack
                    key={i}
                    paddingVertical="$2"
                    borderBottomWidth={i < textFields.length - 1 ? 1 : 0}
                    borderBottomColor="#e2e8f0"
                    justifyContent="space-between"
                  >
                    <SizableText size="$2" color="#475569" numberOfLines={1} flex={1}>
                      {field.text}
                    </SizableText>
                    <SizableText size="$1" color="#94a3b8">
                      {field.fontSize}px · ({field.x}%, {field.y}%)
                    </SizableText>
                  </XStack>
                ))}
              </Card.Header>
            </Card>
          )}

          {/* Action Buttons */}
          {!isEditing && (
            <YStack gap="$3">
              <Button theme="active" size="$4" onPress={handleExport} disabled={isExporting}>
                {isExporting ? (
                  <Spinner size="small" />
                ) : (
                  <Download size={16} color="#fff" />
                )}
                <SizableText color="#fff" marginLeft="$2">
                  {isExporting ? 'Exportando...' : 'Exportar PNG (300 DPI)'}
                </SizableText>
              </Button>

              <Button
                variant="outlined"
                onPress={handleDelete}
                borderColor="#fecaca"
              >
                <Trash2 size={16} color="#ef4444" />
                <SizableText color="#ef4444" marginLeft="$2">
                  Eliminar Etiqueta
                </SizableText>
              </Button>
            </YStack>
          )}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
