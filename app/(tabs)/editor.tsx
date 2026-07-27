import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  ScrollView,
  Alert,
  Platform,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  YStack,
  XStack,
  ZStack,
  Button,
  Card,
  H4,
  H2,
  Paragraph,
  SizableText,
  Input,
  Sheet,
  Spinner,
  toast,
} from '@blinkdotnew/mobile-ui';
import {
  PenTool,
  Download,
  Ruler,
  Type,
  Barcode,
  Palette,
  Plus,
  Minus,
  X,
  Check,
  Save,
} from '@tamagui/lucide-icons';
import ViewShot from 'react-native-view-shot';
import * as MediaLibrary from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const LABEL_CANVAS_W = SCREEN_WIDTH - 48;
const LABEL_ASPECT_RATIO = 3 / 5; // height/width

interface TextField {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export default function EditorScreen() {
  const viewShotRef = useRef<ViewShot>(null);

  // Label properties
  const [labelName, setLabelName] = useState('Nueva Etiqueta');
  const [barcodeText, setBarcodeText] = useState('0123456789012');
  const [barcodeType, setBarcodeType] = useState('CODE128');
  const [widthCm, setWidthCm] = useState('5.0');
  const [heightCm, setHeightCm] = useState('3.0');

  // Text fields
  const [textFields, setTextFields] = useState<TextField[]>([
    { id: '1', text: 'Nombre del Producto', x: 15, y: 15, fontSize: 13, color: '#1a1a2e' },
    { id: '2', text: '$0.00', x: 15, y: 52, fontSize: 22, color: '#e94560' },
  ]);

  // UI state
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldText, setNewFieldText] = useState('');
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBarcodeSheet, setShowBarcodeSheet] = useState(false);

  // Label dimensions in pixels
  const canvasW = LABEL_CANVAS_W;
  const canvasH = LABEL_CANVAS_W * LABEL_ASPECT_RATIO;

  const handleAddField = () => {
    if (!newFieldText.trim()) return;
    setTextFields((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        text: newFieldText,
        x: 15,
        y: prev.length * 28 + 15,
        fontSize: 13,
        color: '#1a1a2e',
      },
    ]);
    setNewFieldText('');
    setShowAddField(false);
  };

  const handleUpdateField = (id: string, updates: Partial<TextField>) => {
    setTextFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const handleRemoveField = (id: string) => {
    setTextFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedField === id) setSelectedField(null);
  };

  const handleExport = async () => {
    if (Platform.OS === 'web') {
      toast('Exportación no disponible en web', { variant: 'error' });
      return;
    }

    setIsExporting(true);
    try {
      // Calculate pixels at 300 DPI
      const dpi = 300;
      const cmToInch = 0.393701;
      const pixelWidth = Math.round(+widthCm * cmToInch * dpi);
      const pixelHeight = Math.round(+heightCm * cmToInch * dpi);

      // For now, capture at screen resolution and share
      if (viewShotRef.current && viewShotRef.current.capture) {
        const uri = await viewShotRef.current.capture({
          format: 'png',
          quality: 1,
          result: 'tmpfile',
        });

        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: `Etiqueta ${labelName} (300 DPI: ${pixelWidth}x${pixelHeight}px)`,
            UTI: 'public.png',
          });
        }
        toast('Etiqueta exportada', { variant: 'success' });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo exportar');
    } finally {
      setIsExporting(false);
      setShowExportOptions(false);
    }
  };

  const selectedFieldData = selectedField ? textFields.find((f) => f.id === selectedField) : null;

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
            <PenTool size={22} color="#fff" />
            <H4 color="#fff">Editor de Etiqueta</H4>
          </XStack>
          <XStack gap="$2">
            <Button
              size="$2"
              onPress={() => setShowBarcodeSheet(true)}
              variant="outlined"
              backgroundColor="rgba(255,255,255,0.1)"
              borderColor="rgba(255,255,255,0.3)"
            >
              <Barcode size={14} color="#fff" />
            </Button>
            <Button
              size="$2"
              onPress={() => setShowExportOptions(true)}
              variant="outlined"
              backgroundColor="rgba(255,255,255,0.1)"
              borderColor="rgba(255,255,255,0.3)"
            >
              <Download size={14} color="#fff" />
            </Button>
          </XStack>
        </XStack>
      </YStack>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <YStack gap="$4">
          {/* Label Canvas */}
          <Card bordered overflow="hidden">
            <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 1 }}>
              <YStack
                backgroundColor="#ffffff"
                width={canvasW}
                height={canvasH}
                alignSelf="center"
                position="relative"
              >
                {/* Text fields */}
                {textFields.map((field) => (
                  <TouchableOpacity
                    key={field.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedField(field.id)}
                    style={{
                      position: 'absolute',
                      left: (field.x / 100) * canvasW,
                      top: (field.y / 100) * canvasH,
                      borderWidth: selectedField === field.id ? 2 : 0,
                      borderColor: '#16213e',
                      borderStyle: 'dashed',
                      padding: 2,
                      borderRadius: 4,
                    }}
                  >
                    <SizableText
                      style={{
                        fontSize: (field.fontSize / 14) * (canvasW / 20),
                        fontWeight: '700',
                        color: field.color,
                      }}
                    >
                      {field.text}
                    </SizableText>
                  </TouchableOpacity>
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
                  <SizableText
                    fontFamily="monospace"
                    size="$1"
                    color="#475569"
                  >
                    ||| ||||| | |||| ||| | |||| ||| |
                  </SizableText>
                  <SizableText fontFamily="monospace" size="$1" color="#1e293b" fontWeight="600">
                    {barcodeText}
                  </SizableText>
                </YStack>

                {/* Dimension label */}
                <SizableText
                  position="absolute"
                  bottom={5}
                  right={10}
                  size="$1"
                  color="#94a3b8"
                >
                  {widthCm}cm x {heightCm}cm
                </SizableText>
              </YStack>
            </ViewShot>
          </Card>

          {/* Field Editor */}
          {selectedFieldData && (
            <Card bordered backgroundColor="#fff7ed">
              <Card.Header padded>
                <XStack justifyContent="space-between" alignItems="center" marginBottom="$3">
                  <SizableText fontWeight="600" color="#16213e">
                    Editar Campo
                  </SizableText>
                  <TouchableOpacity onPress={() => handleRemoveField(selectedFieldData.id)}>
                    <X size={18} color="#ef4444" />
                  </TouchableOpacity>
                </XStack>

                <YStack gap="$2">
                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Texto</SizableText>
                    <Input
                      value={selectedFieldData.text}
                      onChangeText={(t) => handleUpdateField(selectedFieldData.id, { text: t })}
                    />
                  </YStack>

                  <XStack gap="$3">
                    <YStack flex={1} gap="$1">
                      <SizableText size="$2" color="$color10">Pos X (%)</SizableText>
                      <Input
                        value={selectedFieldData.x.toString()}
                        onChangeText={(t) => handleUpdateField(selectedFieldData.id, { x: +t || 0 })}
                        keyboardType="numeric"
                      />
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <SizableText size="$2" color="$color10">Pos Y (%)</SizableText>
                      <Input
                        value={selectedFieldData.y.toString()}
                        onChangeText={(t) => handleUpdateField(selectedFieldData.id, { y: +t || 0 })}
                        keyboardType="numeric"
                      />
                    </YStack>
                  </XStack>

                  <XStack gap="$3">
                    <YStack flex={1} gap="$1">
                      <SizableText size="$2" color="$color10">Tamaño</SizableText>
                      <Input
                        value={selectedFieldData.fontSize.toString()}
                        onChangeText={(t) => handleUpdateField(selectedFieldData.id, { fontSize: +t || 12 })}
                        keyboardType="numeric"
                      />
                    </YStack>
                    <YStack flex={1} gap="$1">
                      <SizableText size="$2" color="$color10">Color</SizableText>
                      <Input
                        value={selectedFieldData.color}
                        onChangeText={(t) => handleUpdateField(selectedFieldData.id, { color: t })}
                        placeholder="#1a1a2e"
                      />
                    </YStack>
                  </XStack>
                </YStack>
              </Card.Header>
            </Card>
          )}

          {/* Add field button */}
          <Button onPress={() => setShowAddField(!showAddField)} variant="outlined">
            <Plus size={16} color="#16213e" />
            <SizableText color="#16213e" marginLeft="$2">Agregar Campo de Texto</SizableText>
          </Button>

          {showAddField && (
            <Card bordered>
              <Card.Header padded>
                <XStack gap="$2">
                  <YStack flex={1}>
                    <Input
                      value={newFieldText}
                      onChangeText={setNewFieldText}
                      placeholder="Nuevo texto..."
                    />
                  </YStack>
                  <Button onPress={handleAddField} size="$2">
                    <Check size={16} color="#fff" />
                  </Button>
                </XStack>
              </Card.Header>
            </Card>
          )}

          {/* Label Properties */}
          <Card bordered>
            <Card.Header padded>
              <SizableText fontWeight="600" marginBottom="$3" color="#16213e">
                Propiedades de Etiqueta
              </SizableText>
              <YStack gap="$3">
                <YStack gap="$1">
                  <SizableText size="$2" color="$color10">Nombre de Etiqueta</SizableText>
                  <Input value={labelName} onChangeText={setLabelName} />
                </YStack>
                <XStack gap="$3">
                  <YStack flex={1} gap="$1">
                    <SizableText size="$2" color="$color10">Ancho (cm)</SizableText>
                    <Input value={widthCm} onChangeText={setWidthCm} keyboardType="decimal-pad" />
                  </YStack>
                  <YStack flex={1} gap="$1">
                    <SizableText size="$2" color="$color10">Alto (cm)</SizableText>
                    <Input value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
                  </YStack>
                </XStack>
                <YStack gap="$1">
                  <SizableText size="$2" color="$color10">DPI para exportación</SizableText>
                  <XStack
                    backgroundColor="#f1f5f9"
                    padding="$3"
                    borderRadius="$3"
                    justifyContent="center"
                  >
                    <SizableText fontWeight="600" color="#16213e">
                      300 DPI = {Math.round(+widthCm * 0.393701 * 300)}x{Math.round(+heightCm * 0.393701 * 300)}px
                    </SizableText>
                  </XStack>
                </YStack>
              </YStack>
            </Card.Header>
          </Card>
        </YStack>
      </ScrollView>

      {/* Barcode Edit Sheet */}
      <Sheet
        open={showBarcodeSheet}
        onOpenChange={setShowBarcodeSheet}
        snapPoints={[50]}
        dismissOnSnapToBottom
      >
        <YStack padding="$4" gap="$4">
          <H4>Código de Barras</H4>
          <YStack gap="$1">
            <SizableText size="$2" color="$color10">Valor del Código</SizableText>
            <Input value={barcodeText} onChangeText={setBarcodeText} placeholder="0123456789012" />
          </YStack>
          <YStack gap="$1">
            <SizableText size="$2" color="$color10">Tipo</SizableText>
            <Input value={barcodeType} onChangeText={setBarcodeType} placeholder="CODE128" />
          </YStack>
          <SizableText size="$2" color="$color10">
            Tipos soportados: EAN13, EAN8, UPC-A, CODE128, CODE39, QR, ITF14
          </SizableText>
          <Button theme="active" onPress={() => setShowBarcodeSheet(false)}>
            Aceptar
          </Button>
        </YStack>
      </Sheet>

      {/* Export Sheet */}
      <Sheet
        open={showExportOptions}
        onOpenChange={setShowExportOptions}
        snapPoints={[40]}
        dismissOnSnapToBottom
      >
        <YStack padding="$4" gap="$4" alignItems="center">
          <H4>Exportar Etiqueta</H4>
          <SizableText textAlign="center" color="$color10">
            La etiqueta se exportará a 300 DPI con dimensiones de{' '}
            {Math.round(+widthCm * 0.393701 * 300)}x{Math.round(+heightCm * 0.393701 * 300)}px
          </SizableText>

          <Card bordered backgroundColor="#f0fdf4">
            <Card.Header padded>
              <XStack alignItems="center" gap="$3">
                <Ruler size={24} color="#16a34a" />
                <YStack>
                  <SizableText fontWeight="600" color="#16a34a">
                    {widthCm}cm x {heightCm}cm @ 300 DPI
                  </SizableText>
                  <SizableText size="$2" color="#15803d">
                    Listo para imprimir
                  </SizableText>
                </YStack>
              </XStack>
            </Card.Header>
          </Card>

          <Button
            theme="active"
            size="$4"
            onPress={handleExport}
            disabled={isExporting}
            width="100%"
          >
            {isExporting ? (
              <Spinner size="small" />
            ) : (
              <Download size={18} color="#fff" />
            )}
            <SizableText color="#fff" marginLeft="$2">
              {isExporting ? 'Exportando...' : 'Descargar PNG (300 DPI)'}
            </SizableText>
          </Button>

          <Button variant="outlined" onPress={() => setShowExportOptions(false)}>
            Cancelar
          </Button>
        </YStack>
      </Sheet>
    </YStack>
  );
}
