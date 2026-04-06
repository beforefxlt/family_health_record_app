import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { documentService } from '../api/services';
import { getServerHost, getApiBaseUrl } from '../config/serverConfig';

export default function UploadPage() {
  const router = useRouter();
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('权限不足', '需要访问相册权限以上传图片');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permissionResult.granted) {
      Alert.alert('权限不足', '需要访问相机权限以拍照');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const uploadImage = async () => {
    if (!selectedImage) return;

    setUploading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', {
        uri: selectedImage,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);
      
      if (memberId) {
        formData.append('member_id', memberId);
      }

      setProgress(30);

      const host = await getServerHost();
      const response = await fetch(
        `${getApiBaseUrl(host)}/api/v1/documents/upload`,
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setProgress(70);

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      
      setProgress(100);

      if (data.document_id) {
        if (data.status === 'duplicate') {
          Alert.alert('已存在', data.message || '该检查单已上传过', [
            { text: '确定', onPress: () => router.back() }
          ]);
          return;
        }

        setProgress(0);
        Alert.alert('上传成功', '正在识别检查单...', []);

        try {
          setProgress(20);
          const ocrResponse = await fetch(
            `${getApiBaseUrl(host)}/api/v1/documents/${data.document_id}/submit-ocr`,
            { method: 'POST' }
          );

          setProgress(80);

          if (!ocrResponse.ok) {
            throw new Error('OCR failed');
          }

          const ocrResult = await ocrResponse.json();
          
          setProgress(100);

          if (ocrResult.status === 'approved' || ocrResult.status === 'persisted') {
            Alert.alert('识别成功', '数据已自动入库', [
              { text: '确定', onPress: () => router.replace(`/member/${memberId || ''}`) }
            ]);
          } else if (ocrResult.status === 'rule_conflict' || ocrResult.status === 'ocr_failed') {
            Alert.alert('需要审核', '请核对检查单数据', [
              { text: '去审核', onPress: () => router.replace(`/review/${data.document_id}`) }
            ]);
          } else {
            Alert.alert('识别中', '检查单已提交，请稍后查看审核', [
              { text: '查看审核', onPress: () => router.replace(`/review/${data.document_id}`) },
              { text: '返回', onPress: () => router.back() }
            ]);
          }
        } catch (ocrError) {
          console.error('OCR error:', ocrError);
          Alert.alert('识别失败', '请稍后重试或手工录入', [
            { text: '去审核', onPress: () => router.replace(`/review/${data.document_id}`) },
            { text: '返回', onPress: () => router.back() }
          ]);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('上传失败', '请重试');
    } finally {
      setUploading(false);
    }
  };

  const cancel = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.handle} />
      
      <Text style={styles.title}>选择检查单图片</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.optionButton} onPress={takePhoto}>
          <Text style={styles.optionIcon}>📷</Text>
          <Text style={styles.optionText}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
          <Text style={styles.optionIcon}>🖼️</Text>
          <Text style={styles.optionText}>相册</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.uploadArea} onPress={pickImage}>
        {selectedImage ? (
          <Image source={{ uri: selectedImage }} style={styles.previewImage} />
        ) : (
          <View style={styles.uploadPlaceholder}>
            <Text style={styles.uploadIcon}>+</Text>
            <Text style={styles.uploadText}>点击上传</Text>
            <Text style={styles.uploadSubtext}>或拍照</Text>
          </View>
        )}
      </TouchableOpacity>

      {selectedImage && (
        <TouchableOpacity 
          style={styles.confirmButton} 
          onPress={uploadImage}
          disabled={uploading}
        >
          <Text style={styles.confirmText}>确认上传</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.supportedFormats}>支持 JPG, PNG, PDF</Text>

      {uploading && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>上传中... {Math.round(progress)}%</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.cancelButton} onPress={cancel}>
        <Text style={styles.cancelText}>取消</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 24,
  },
  optionButton: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    width: 100,
  },
  optionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  uploadArea: {
    height: 200,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#ddd',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    alignItems: 'center',
  },
  uploadIcon: {
    fontSize: 48,
    color: '#ccc',
  },
  uploadText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  supportedFormats: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#eee',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  cancelButton: {
    position: 'absolute',
    bottom: 32,
    left: 16,
    right: 16,
    padding: 16,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
  },
});
