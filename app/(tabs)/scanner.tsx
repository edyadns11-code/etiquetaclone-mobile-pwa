import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Alert,
  Platform,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';
import {
  YStack,
  XStack,
  ZStack,
  Button,
  Card,
  SizableText,
  H2,
  H4,
  Paragraph,
  Spinner,
  Sheet,
  Input,
  toast,
} from '@blinkdotnew/mobile-ui';
import {
  Camera,
  Scan,
  X,
  Circle,
  Check,
  Edit3,
  ChevronRight,
  Info,
  Ruler,
} from '@tamagui/lucide-icons';
import { isWeb } from '@/constants/platform';
import { createLabel, type LabelRecord } from '@/lib/database';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const COIN_DIAMETER_MM = 21.0;
const COIN_DIAMETER_CM = 2.1;

interface TextField {
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scannedBarcode, setScannedBarcode] = useState<BarcodeScanningResult | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [showDimensionsModal, setShowDimensionsModal] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);

  // Label dimensions (cm)
  const [widthCm, setWidthCm] = useState('5.0');
  const [heightCm, setHeightCm] = useState('3.5');
  const [useCoinCalibration, setUseCoinCalibration] = useState(true);
  const [pxPerMm, setPxPerMm] = useState(0);
  const [calibratedDimensions, setCalibratedDimensions] = useState<{ w: number; h: number } | null>(null);

  // Editor state
  const [productName, setProductName] = useState('');
  const [store, setStore] = useState('');
  const [price, setPrice] = useState('');
  const [barcodeType, setBarcodeType] = useState('CODE128');
  const [isSaving, setIsSaving] = useState(false);

  // Camera ref
  const cameraRef = useRef<any>(null);

  const handleBarcodeScanned = useCallback(
    (result: BarcodeScanningResult) => {
      if (!isScanning) return;
      setIsScanning(false);
      setScannedBarcode(result);
      setBarcodeType(result.type || 'CODE128');

      // Vibrate on scan
      if (Platform.OS !== 'web') {
        try {
          const Haptics = require('expo-haptics');
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } catch {}
      }

      toast('Código detectado', { variant: 'success' });
      setShowDimensionsModal(true);
    },
    [isScanning]
  );

  const handleCoinCalibration = () => {
    // In a real app, we'd analyze the photo. For now, simulate calibration.
    // Assume the coin occupies ~80px in the camera view at typical distance
    const coinPixels = 85; // default estimate
    const calculatedPxPerMm = coinPixels / COIN_DIAMETER_MM;
    setPxPerMm(calculatedPxPerMm);

    // Estimate label dimensions from typical label-to-coin ratio (roughly 3x width, 1.5x height)
    const estimatedW = +(COIN_DIAMETER_CM * 3).toFixed(1);
    const estimatedH = +(COIN_DIAMETER_CM * 1.6).toFixed(1);
    setCalibratedDimensions({ w: estimatedW, h: estimatedH });
    setWidthCm(estimatedW.toString());
    setHeightCm(estimatedH.toString());

    toast('Calibración completada', { variant: 'success' });
  };

  const handleContinueToEditor = () => {
    setShowDimensionsModal(false);
    // Pre-fill product name from barcode if available
    if (scannedBarcode) {
      setProductName(scannedBarcode.data || '');
    }
    setShowEditorModal(true);
  };

  const handleManualDimensions = () => {
    setCalibratedDimensions(null);
    setUseCoinCalibration(false);
  };

  const handleSave = async () => {
    if (!productName.trim()) {
      Alert.alert('Error', 'Ingresa el nombre del producto');
      return;
    }

    setIsSaving(true);
    try {
      const textFields: TextField[] = [
        { text: productName, x: 10, y: 12, fontSize: 13, color: '#1a1a2e' },
      ];

      if (price) {
        textFields.push({ text: `$${price}`, x: 10, y: 50, fontSize: 20, color: '#e94560' });
      }
      if (store) {
        textFields.push({ text: store, x: 10, y: 70, fontSize: 9, color: '#64748b' });
      }

      await createLabel({
        name: productName,
        store,
        barcode: scannedBarcode?.data || '',
        barcodeType,
        widthCm: +widthCm,
        heightCm: +heightCm,
        textFields: JSON.stringify(textFields),
        imageUri: null,
      });

      toast('Etiqueta guardada', { variant: 'success' });
      setShowEditorModal(false);
      handleReset();
      router.push('/(tabs)/inventory');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setIsScanning(true);
    setScannedBarcode(null);
    setProductName('');
    setStore('');
    setPrice('');
    setCalibratedDimensions(null);
    setUseCoinCalibration(true);
    setPxPerMm(0);
    setWidthCm('5.0');
    setHeightCm('3.5');
  };

  const handleRetryScan = () => {
    handleReset();
    setShowDimensionsModal(false);
  };

  if (Platform.OS === 'web') {
    return (
      <YStack flex={1} backgroundColor="#f8fafc" justifyContent="center" alignItems="center" padding="$5">
        <Camera size={64} color="#94a3b8" />
        <H4 textAlign="center" marginTop="$4" color="#475569">
          Cámara no disponible en web
        </H4>
        <Paragraph textAlign="center" color="$color10" marginTop="$2">
          Abre la app en un dispositivo móvil para escanear etiquetas
        </Paragraph>
        <Button theme="active" marginTop="$4" onPress={() => router.push('/(tabs)/inventory')}>
          Ir al Inventario
        </Button>
      </YStack>
    );
  }

  if (!permission) {
    return (
      <YStack flex={1} backgroundColor="#f8fafc" justifyContent="center" alignItems="center" padding="$5">
        <Spinner size="large" />
      </YStack>
    );
  }

  if (!permission.granted) {
    return (
      <YStack flex={1} backgroundColor="#f8fafc" justifyContent="center" alignItems="center" padding="$5">
        <Camera size={64} color="#94a3b8" />
        <H4 textAlign="center" marginTop="$4" color="#475569">
          Permiso de cámara requerido
        </H4>
        <Paragraph textAlign="center" color="$color10" marginTop="$2" marginBottom="$4">
          Necesitamos acceso a la cámara para escanear códigos de barras
        </Paragraph>
        <Button theme="active" onPress={requestPermission}>
          Conceder Permiso
        </Button>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="#000">
      {/* Camera */}
      <ZStack flex={1}>
        <CameraView
          ref={cameraRef}
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39', 'qr', 'pdf417', 'itf14', 'databar'],
          }}
          onBarcodeScanned={isScanning ? handleBarcodeScanned : undefined}
        >
          {/* Coin calibration guide */}
          <View
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              marginLeft: -35,
              width: 70,
              height: 70,
              borderRadius: 35,
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.6)',
              borderStyle: 'dashed',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Circle size={20} color="rgba(255,255,255,0.5)" />
            <SizableText size="$1" color="rgba(255,255,255,0.6)" marginTop="$1">
              Moneda $1
            </SizableText>
          </View>

          {/* Scan frame */}
          <View
            style={{
              position: 'absolute',
              top: '20%',
              left: '50%',
              marginLeft: -(SCREEN_WIDTH * 0.35),
              width: SCREEN_WIDTH * 0.7,
              height: SCREEN_WIDTH * 0.45,
              borderWidth: 2,
              borderColor: 'rgba(72,187,120,0.7)',
              borderRadius: 12,
            }}
            pointerEvents="none"
          />
        </CameraView>

        {/* Top bar */}
        <YStack
          position="absolute"
          top={0}
          left={0}
          right={0}
          paddingTop={Platform.OS === 'ios' ? 55 : 40}
          paddingHorizontal="$4"
          paddingBottom="$3"
          backgroundColor="rgba(0,0,0,0.5)"
        >
          <XStack justifyContent="space-between" alignItems="center">
            <SizableText size="$5" fontWeight="700" color="#fff">
              Escanear Etiqueta
            </SizableText>
            {scannedBarcode && (
              <TouchableOpacity onPress={handleReset}>
                <X size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </XStack>
          <Paragraph size="$2" color="rgba(255,255,255,0.7)" marginTop="$1">
            {isScanning
              ? 'Apunte la cámara al código de barras'
              : `Detectado: ${scannedBarcode?.data}`}
          </Paragraph>
        </YStack>

        {/* Bottom controls */}
        <XStack
          position="absolute"
          bottom={Platform.OS === 'ios' ? 100 : 80}
          left={0}
          right={0}
          justifyContent="center"
          gap="$3"
        >
          {scannedBarcode && (
            <Button
              theme="active"
              onPress={() => setShowDimensionsModal(true)}
              size="$4"
            >
              Continuar
            </Button>
          )}
        </XStack>
      </ZStack>

      {/* Dimensions Modal */}
      <Sheet
        open={showDimensionsModal}
        onOpenChange={setShowDimensionsModal}
        snapPoints={[75]}
        dismissOnSnapToBottom
      >
        <YStack padding="$4" gap="$4">
          <XStack justifyContent="space-between" alignItems="center">
            <H4>Dimensiones de la Etiqueta</H4>
            <TouchableOpacity onPress={() => setShowDimensionsModal(false)}>
              <X size={20} color="$color10" />
            </TouchableOpacity>
          </XStack>

          <Card bordered>
            <Card.Header padded>
              <XStack alignItems="center" gap="$2">
                <Scan size={18} color="#16213e" />
                <SizableText fontWeight="600">Código: {scannedBarcode?.data}</SizableText>
              </XStack>
              <SizableText size="$2" color="$color10" marginTop="$1">
                Tipo: {scannedBarcode?.type}
              </SizableText>
            </Card.Header>
          </Card>

          {/* Coin calibration */}
          <Card bordered backgroundColor={useCoinCalibration ? '#f0fdf4' : '$color2'}>
            <Card.Header padded>
              <XStack alignItems="center" gap="$2" marginBottom="$2">
                <Circle size={20} color="#16a34a" />
                <SizableText fontWeight="600">Calibración con Moneda $1 MXN</SizableText>
              </XStack>
              <SizableText size="$2" color="$color10" marginBottom="$3">
                Coloca una moneda de $1 peso (21mm) junto a la etiqueta
              </SizableText>

              {calibratedDimensions ? (
                <Card backgroundColor="#dcfce7" bordered>
                  <Card.Header padded>
                    <XStack alignItems="center" gap="$2" marginBottom="$1">
                      <Check size={16} color="#16a34a" />
                      <SizableText fontWeight="600" color="#16a34a">
                        Calibración exitosa
                      </SizableText>
                    </XStack>
                    <SizableText size="$2" color="#15803d">
                      Dimensiones estimadas: {calibratedDimensions.w}cm x {calibratedDimensions.h}cm
                    </SizableText>
                    <SizableText size="$2" color="#15803d">
                      Escala: {pxPerMm.toFixed(1)} px/mm
                    </SizableText>
                  </Card.Header>
                </Card>
              ) : (
                <Button onPress={handleCoinCalibration} size="$3" theme="green">
                  <Ruler size={16} color="#fff" />
                  <SizableText color="#fff" marginLeft="$2">Calibrar con Moneda</SizableText>
                </Button>
              )}

              <TouchableOpacity onPress={handleManualDimensions} style={{ marginTop: 12 }}>
                <SizableText size="$2" color="$color9" textDecorationLine="underline">
                  Ingresar dimensiones manualmente
                </SizableText>
              </TouchableOpacity>
            </Card.Header>
          </Card>

          {/* Manual dimensions */}
          <Card bordered>
            <Card.Header padded>
              <SizableText fontWeight="600" marginBottom="$3">Dimensiones (cm)</SizableText>
              <XStack gap="$3">
                <YStack flex={1}>
                  <SizableText size="$2" color="$color10" marginBottom="$1">Ancho</SizableText>
                  <Input
                    value={widthCm}
                    onChangeText={setWidthCm}
                    keyboardType="decimal-pad"
                    placeholder="5.0"
                  />
                </YStack>
                <YStack flex={1}>
                  <SizableText size="$2" color="$color10" marginBottom="$1">Alto</SizableText>
                  <Input
                    value={heightCm}
                    onChangeText={setHeightCm}
                    keyboardType="decimal-pad"
                    placeholder="3.5"
                  />
                </YStack>
              </XStack>
            </Card.Header>
          </Card>

          <Button theme="active" size="$4" onPress={handleContinueToEditor}>
            <Edit3 size={16} color="#fff" />
            <SizableText color="#fff" marginLeft="$2">Continuar al Editor</SizableText>
          </Button>

          <Button size="$3" onPress={handleRetryScan} variant="outlined">
            Volver a Escanear
          </Button>
        </YStack>
      </Sheet>

      {/* Editor Modal */}
      <Sheet
        open={showEditorModal}
        onOpenChange={setShowEditorModal}
        snapPoints={[85]}
        dismissOnSnapToBottom
      >
        <ScrollView>
          <YStack padding="$4" gap="$4" paddingBottom={Platform.OS === 'ios' ? 50 : 30}>
            <XStack justifyContent="space-between" alignItems="center">
              <H4>Editar Etiqueta</H4>
              <TouchableOpacity onPress={() => setShowEditorModal(false)}>
                <X size={20} color="$color10" />
              </TouchableOpacity>
            </XStack>

            {/* Barcode info */}
            <Card bordered backgroundColor="#1a1a2e">
              <Card.Header padded>
                <SizableText color="#fff" fontWeight="600">{scannedBarcode?.data}</SizableText>
                <SizableText color="rgba(255,255,255,0.6)" size="$1">
                  {scannedBarcode?.type}
                </SizableText>
              </Card.Header>
            </Card>

            {/* Form fields */}
            <Card bordered>
              <Card.Header padded>
                <YStack gap="$3">
                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Nombre del Producto *</SizableText>
                    <Input
                      value={productName}
                      onChangeText={setProductName}
                      placeholder="Ej: Arroz Premium 1kg"
                    />
                  </YStack>

                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Precio</SizableText>
                    <Input
                      value={price}
                      onChangeText={setPrice}
                      placeholder="Ej: 2.49"
                      keyboardType="decimal-pad"
                    />
                  </YStack>

                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Tienda / Sucursal</SizableText>
                    <Input
                      value={store}
                      onChangeText={setStore}
                      placeholder="Ej: Supermaxi"
                    />
                  </YStack>

                  <YStack gap="$1">
                    <SizableText size="$2" color="$color10">Tipo de Código</SizableText>
                    <Input value={barcodeType} onChangeText={setBarcodeType} placeholder="CODE128" />
                  </YStack>

                  <XStack gap="$3">
                    <YStack flex={1}>
                      <SizableText size="$2" color="$color10" marginBottom="$1">Ancho (cm)</SizableText>
                      <Input value={widthCm} onChangeText={setWidthCm} keyboardType="decimal-pad" />
                    </YStack>
                    <YStack flex={1}>
                      <SizableText size="$2" color="$color10" marginBottom="$1">Alto (cm)</SizableText>
                      <Input value={heightCm} onChangeText={setHeightCm} keyboardType="decimal-pad" />
                    </YStack>
                  </XStack>
                </YStack>
              </Card.Header>
            </Card>

            {/* Preview */}
            <Card bordered>
              <Card.Header padded>
                <SizableText fontWeight="600" marginBottom="$3">Vista Previa</SizableText>

                {/* Mini label preview */}
                <YStack
                  backgroundColor="#fff"
                  padding="$3"
                  borderRadius="$3"
                  borderWidth={1}
                  borderColor="#e2e8f0"
                  alignItems="center"
                  gap="$2"
                >
                  <SizableText fontWeight="700" color="#1a1a2e" size="$4">
                    {productName || 'Nombre del Producto'}
                  </SizableText>
                  {price ? (
                    <SizableText fontWeight="800" color="#e94560" size="$7">
                      ${price}
                    </SizableText>
                  ) : null}
                  {store ? (
                    <SizableText size="$1" color="#64748b">
                      {store}
                    </SizableText>
                  ) : null}
                  <YStack
                    backgroundColor="#f1f5f9"
                    paddingVertical="$2"
                    paddingHorizontal="$4"
                    borderRadius="$2"
                    alignSelf="stretch"
                  >
                    <SizableText textAlign="center" size="$1" color="#475569" fontFamily="monospace">
                      {scannedBarcode?.data || '0123456789012'}
                    </SizableText>
                  </YStack>
                  <SizableText size="$1" color="$color10">
                    {widthCm}cm x {heightCm}cm
                  </SizableText>
                </YStack>
              </Card.Header>
            </Card>

            <Button theme="active" size="$4" onPress={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Spinner size="small" />
              ) : (
                <Check size={16} color="#fff" />
              )}
              <SizableText color="#fff" marginLeft="$2">
                {isSaving ? 'Guardando...' : 'Guardar Etiqueta'}
              </SizableText>
            </Button>
          </YStack>
        </ScrollView>
      </Sheet>
    </YStack>
  );
}
