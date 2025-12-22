// screens/UploadPDFScreen.js
import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { MaterialIcons } from "@expo/vector-icons";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system";

// Firebase imports (adjust based on your setup)
// import { storage, firestore } from '../config/firebase';
// import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
// import { collection, addDoc, getDocs, updateDoc, doc, query, where } from 'firebase/firestore';

export default function UploadPDFScreen({ navigation }) {
  const [uploads, setUploads] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [showNotesPreview, setShowNotesPreview] = useState(false);
  const [matchingNotes, setMatchingNotes] = useState([]);
  const [processingProgress, setProcessingProgress] = useState("");
  const [noteTitle, setNoteTitle] = useState("");
  const fileInputRef = useRef(null);

  // Gemini API Configuration
  const GEMINI_API_KEY = "AIzaSyCZVQqMteS8jSA_cAYOUS0XxzwHxzgIaNI";
  const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

  // Web-specific file upload handler
  const handleWebFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const newUploads = files.map((file) => ({
      id: Date.now() + Math.random(),
      uri: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size,
      webFile: file,
    }));
    setUploads([...uploads, ...newUploads]);
  };

  // File type icons
  const getFileIcon = (type) => {
    if (type.includes("image")) return "image";
    if (type.includes("pdf")) return "picture-as-pdf";
    if (type.includes("word") || type.includes("document")) return "description";
    return "insert-drive-file";
  };

  // Pick images from camera or gallery
  const pickImages = async (fromCamera = false) => {
    try {
      if (Platform.OS === "web" && fromCamera) {
        Alert.alert("Not Available", "Camera is not available on web. Please use gallery or file upload.");
        return;
      }

      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "We need camera roll permissions.");
        return;
      }

      let result;
      if (fromCamera) {
        const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
        if (cameraStatus.status !== "granted") {
          Alert.alert("Permission Denied", "We need camera permissions.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: false,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          quality: 0.8,
        });
      }

      if (!result.canceled) {
        const newUploads = result.assets.map((asset) => ({
          id: Date.now() + Math.random(),
          uri: asset.uri,
          name: asset.fileName || `image_${Date.now()}.jpg`,
          type: asset.type || asset.mimeType || "image/jpeg",
          size: asset.fileSize || 0,
        }));
        setUploads([...uploads, ...newUploads]);
      }
    } catch (error) {
      console.error("ImagePicker Error:", error);
      Alert.alert("Error", "Could not open image picker.");
    }
  };

  // Pick documents (PDF, DOCX)
  const pickDocuments = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        multiple: true,
      });

      if (result.type === "success" || result.assets) {
        const files = result.assets || [result];
        const newUploads = files.map((file) => ({
          id: Date.now() + Math.random(),
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/pdf",
          size: file.size,
        }));
        setUploads([...uploads, ...newUploads]);
      }
    } catch (error) {
      console.error("DocumentPicker Error:", error);
      Alert.alert("Error", "Could not open document picker.");
    }
  };

  // Remove upload
  const removeUpload = (id) => {
    setUploads(uploads.filter((item) => item.id !== id));
  };

  // Convert file to base64 - Cross-platform solution
  const fileToBase64 = async (uri, webFile = null) => {
    try {
      if (Platform.OS === "web") {
        if (webFile) {
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(webFile);
          });
        } else {
          const response = await fetch(uri);
          const blob = await response.blob();
          
          return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        }
      } else {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        return base64;
      }
    } catch (error) {
      console.error("Error converting to base64:", error);
      return null;
    }
  };

  // Analyze image with Gemini AI
  const analyzeImage = async (file) => {
    const base64 = await fileToBase64(file.uri, file.webFile);
    if (!base64) throw new Error("Could not convert image to base64");

    const prompt = `You are an expert note-taking assistant. Analyze this image which may contain:
- Handwritten notes from a whiteboard
- Diagrams or mind maps
- Lecture notes or study materials
- Charts, tables, or visual data

Extract and organize ALL the content into well-structured, detailed notes with: (only if the content is present in the image for example ,an image may only contain examples so dont bother giving definitions,key points,subtopics or formulas if not present)
1. A clear, descriptive title based on the content
2. Main topics and subtopics with proper hierarchy
3. All key points, definitions, and explanations
4. Any formulas, equations, or important data (formatted clearly)
5. Diagrams descriptions if present
6. Summary or key takeaways

Format the output as clean, organized markdown-style notes that a student can use for studying. Be thorough and don't miss any important information from the image.`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API error:", errorData);
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    console.log("Gemini response:", JSON.stringify(data, null, 2));
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
      const textParts = data.candidates[0].content.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join('\n');
      
      if (textParts) {
        return textParts;
      }
    }
    
    throw new Error("Gemini returned no content");
  };

  // Analyze document with Gemini AI
  const analyzeDocument = async (file) => {
    // For documents, we'll ask user to provide a summary or use OCR
    const prompt = `You are an expert note-taking assistant. A student has uploaded a document titled "${file.name}". 

Create a comprehensive note template for this document that includes:
1. A clear title based on the dominant topic you identify
2. Main sections the student should fill in:(check if the content is enough to provide these sections , where not possible for example the image lists examples , just stick to examples)
   - Introduction/Overview
   - Key Concepts
   - Important Points 
   - Definitions
   - Examples
   - Summary
3. Helpful prompts for each section

Format as organized neat notes.`;

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topK: 32,
          topP: 1,
          maxOutputTokens: 2048,
          // mimeTypeArray: [file.type],[image/png,image/jpg,image/jpeg,application/pdf]
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (data.candidates && data.candidates.length > 0 && data.candidates[0].content) {
      const textParts = data.candidates[0].content.parts
        .filter(part => part.text)
        .map(part => part.text)
        .join('\n');
      
      if (textParts) {
        return textParts;
      }
    }
    
    throw new Error("Gemini returned no content");
  };

  // Check for matching notes in existing notes
  const checkForMatches = async (generatedContent) => {
    try {
      // TODO: Fetch existing notes from Firebase
      // const notesRef = collection(firestore, 'notes');
      // const notesSnapshot = await getDocs(notesRef);
      // const existingNotes = notesSnapshot.docs.map(doc => ({
      //   id: doc.id,
      //   ...doc.data()
      // }));

      // Mock existing notes for demo
      const existingNotes = [];

      // Extract keywords from generated content for matching
      const keywords = generatedContent
        .toLowerCase()
        .split(/\s+/)
        .filter(word => word.length > 4); // Only words longer than 4 chars

      const matches = existingNotes.filter((note) => {
        const noteContent = (note.title + " " + note.content).toLowerCase();
        const matchCount = keywords.filter(keyword => noteContent.includes(keyword)).length;
        const similarity = matchCount / Math.max(keywords.length, 1);
        return similarity > 0.3; // 30% keyword overlap
      });

      return matches;
    } catch (error) {
      console.error("Error checking for matches:", error);
      return [];
    }
  };

  // Process all uploads
  const processUploads = async () => {
    if (uploads.length === 0) {
      Alert.alert("No Files", "Please upload at least one file.");
      return;
    }

    setIsProcessing(true);
    let allNotes = "";

    try {
      for (let i = 0; i < uploads.length; i++) {
        const file = uploads[i];
        setProcessingProgress(`Processing ${i + 1} of ${uploads.length}: ${file.name}`);

        let notes;
        if (file.type.includes("image")) {
          notes = await analyzeImage(file);
        } else if (file.type.includes("pdf") || file.type.includes("document")) {
          notes = await analyzeDocument(file);
        } else {
          notes = `Unable to process file type: ${file.type}`;
        }

        if (uploads.length === 1) {
          allNotes = notes;
        } else {
          allNotes += `\n\n${"=".repeat(60)}\n`;
          allNotes += `📄 Notes from: ${file.name}\n`;
          allNotes += `${"=".repeat(60)}\n\n`;
          allNotes += notes;
        }
      }

      setGeneratedNotes(allNotes);
      
      // Extract title from first line of notes
      const firstLine = allNotes.split('\n')[0];
      const extractedTitle = firstLine.replace(/^#+\s*/, '').substring(0, 100);
      setNoteTitle(extractedTitle || `AI Generated Notes - ${new Date().toLocaleDateString()}`);

      // Check for matching notes
      const matches = await checkForMatches(allNotes);
      if (matches.length > 0) {
        setMatchingNotes(matches);
        setShowMergeModal(true);
      } else {
        // Show preview before saving
        setShowNotesPreview(true);
      }
    } catch (error) {
      console.error("Processing error:", error);
      Alert.alert(
        "Processing Failed", 
        error.message || "Failed to process uploads. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsProcessing(false);
      setProcessingProgress("");
    }
  };

  // Save notes to Firebase
  const saveNotes = async (content, mergeWithId = null) => {
    try {
      if (mergeWithId) {
        // Merge with existing note
        // const noteRef = doc(firestore, 'notes', mergeWithId);
        // const existingNote = matchingNotes.find(n => n.id === mergeWithId);
        // await updateDoc(noteRef, {
        //   content: existingNote.content + '\n\n--- Merged Content ---\n\n' + content,
        //   updatedAt: new Date()
        // });
        Alert.alert("Success! 🎉", "Notes merged successfully!", [
          {
            text: "OK",
            onPress: () => {
              // Clear and reset
              setUploads([]);
              setGeneratedNotes(null);
              setShowMergeModal(false);
              setShowNotesPreview(false);
              setMatchingNotes([]);
              setNoteTitle("");
            }
          }
        ]);
      } else {
        // Create new note
        // await addDoc(collection(firestore, 'notes'), {
        //   title: noteTitle,
        //   content: content,
        //   createdAt: new Date(),
        //   updatedAt: new Date(),
        //   source: 'ai_upload',
        //   tags: [], // You can extract tags from content
        // });
        
        console.log("Saving note with title:", noteTitle);
        console.log("Note content length:", content.length);
        
        Alert.alert("Success! 🎉", "Notes saved successfully!", [
          {
            text: "View Notes",
            onPress: () => {
              // navigation.navigate('Notes');
            }
          },
          {
            text: "Upload More",
            onPress: () => {
              // Clear and reset
              setUploads([]);
              setGeneratedNotes(null);
              setShowMergeModal(false);
              setShowNotesPreview(false);
              setMatchingNotes([]);
              setNoteTitle("");
            }
          }
        ]);
      }
    } catch (error) {
      console.error("Save error:", error);
      Alert.alert("Error", "Failed to save notes. Please try again.");
    }
  };

  // Handle merge decision
  const handleMergeDecision = (noteId) => {
    Alert.alert(
      "Merge Notes",
      "Do you want to merge the generated content with the existing note?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Create New",
          onPress: () => {
            setShowMergeModal(false);
            setShowNotesPreview(true);
          },
        },
        {
          text: "Merge",
          onPress: () => {
            setShowMergeModal(false);
            saveNotes(generatedNotes, noteId);
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <MaterialIcons name="note" size={48} color="#7c3aed" />
          <Text style={styles.title}>From Image to Notes👌</Text>
          <Text style={styles.description}>
            Upload whiteboard photos, diagrams, or documents. We will analyze and generate organized study notes.
          </Text>
        </View>

        {/* Upload Buttons */}
        <View style={styles.buttonContainer}>
          {Platform.OS !== "web" && (
            <TouchableOpacity style={styles.uploadButton} onPress={() => pickImages(true)}>
              <MaterialIcons name="camera-alt" size={24} color="#7c3aed" />
              <Text style={styles.uploadButtonText}>Camera</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.uploadButton} onPress={() => pickImages(false)}>
            <MaterialIcons name="photo-library" size={24} color="#7c3aed" />
            <Text style={styles.uploadButtonText}>Gallery</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.uploadButton} onPress={pickDocuments}>
            <MaterialIcons name="description" size={24} color="#7c3aed" />
            <Text style={styles.uploadButtonText}>Files</Text>
          </TouchableOpacity>
        </View>

        {/* Web File Input */}
        {Platform.OS === "web" && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              multiple
              style={{ display: 'none' }}
              onChange={handleWebFileUpload}
            />
            <TouchableOpacity
              style={styles.webUploadButton}
              onPress={() => fileInputRef.current?.click()}
            >
              <MaterialIcons name="cloud-upload" size={24} color="#fff" />
              <Text style={styles.webUploadButtonText}>Or Choose Files from Device</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Uploaded Files */}
        {uploads.length > 0 && (
          <View style={styles.uploadsSection}>
            <Text style={styles.sectionTitle}>Ready to Process ({uploads.length})</Text>
            {uploads.map((file) => (
              <View key={file.id} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  {file.type.includes("image") ? (
                    <Image source={{ uri: file.uri }} style={styles.thumbnail} />
                  ) : (
                    <View style={styles.iconContainer}>
                      <MaterialIcons name={getFileIcon(file.type)} size={32} color="#7c3aed" />
                    </View>
                  )}
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    <Text style={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => removeUpload(file.id)}>
                  <MaterialIcons name="close" size={24} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Process Button */}
        {uploads.length > 0 && !isProcessing && (
          <TouchableOpacity style={styles.processButton} onPress={processUploads}>
            <MaterialIcons name="auto-fix-high" size={24} color="#fff" />
            <Text style={styles.processButtonText}>Generate Notes with AI</Text>
          </TouchableOpacity>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#7c3aed" />
            <Text style={styles.processingText}>{processingProgress}</Text>
            <Text style={styles.processingSubtext}>AI is analyzing your content...</Text>
          </View>
        )}

        {/* Info Box */}
        {uploads.length === 0 && (
          <View style={styles.infoBox}>
            <MaterialIcons name="lightbulb" size={24} color="#7c3aed" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Tips for Best Results:</Text>
              <Text style={styles.infoText}>• Take clear, well-lit photos of whiteboards</Text>
              <Text style={styles.infoText}>• Ensure text is readable and not blurry</Text>
              <Text style={styles.infoText}>• Upload multiple images for comprehensive notes</Text>
              <Text style={styles.infoText}>• Works with diagrams, charts, and mind maps</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Notes Preview Modal */}
      <Modal visible={showNotesPreview} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Preview Generated Notes</Text>
            <TouchableOpacity onPress={() => setShowNotesPreview(false)}>
              <MaterialIcons name="close" size={28} color="#374151" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={styles.modalScrollContent}>
            <View style={styles.titleInputContainer}>
              <Text style={styles.inputLabel}>Note Title:</Text>
              <TextInput
                style={styles.titleInput}
                value={noteTitle}
                onChangeText={setNoteTitle}
                placeholder="Enter note title..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.notesPreviewContainer}>
              <Text style={styles.notesPreviewLabel}>Content:</Text>
              <ScrollView style={styles.notesPreviewScroll} nestedScrollEnabled>
                <Text style={styles.notesPreviewText}>{generatedNotes}</Text>
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSecondary]}
              onPress={() => setShowNotesPreview(false)}
            >
              <Text style={styles.modalButtonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonPrimary]}
              onPress={() => {
                setShowNotesPreview(false);
                saveNotes(generatedNotes, null);
              }}
            >
              <MaterialIcons name="save" size={20} color="#fff" />
              <Text style={styles.modalButtonTextPrimary}>Save Notes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Merge Modal */}
      <Modal visible={showMergeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.mergeModalTitle}>Similar Notes Found</Text>
            <Text style={styles.modalDescription}>
              We found {matchingNotes.length} existing note(s) with similar content.
            </Text>

            <FlatList
              data={matchingNotes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.matchItem} onPress={() => handleMergeDecision(item.id)}>
                  <MaterialIcons name="note" size={24} color="#7c3aed" />
                  <View style={styles.matchInfo}>
                    <Text style={styles.matchTitle}>{item.title}</Text>
                    <Text style={styles.matchPreview} numberOfLines={2}>
                      {item.content}
                    </Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={24} color="#9ca3af" />
                </TouchableOpacity>
              )}
              style={styles.matchList}
            />

            <TouchableOpacity
              style={styles.createNewButton}
              onPress={() => {
                setShowMergeModal(false);
                setShowNotesPreview(true);
              }}
            >
              <MaterialIcons name="add" size={20} color="#fff" />
              <Text style={styles.createNewButtonText}>Create New Note</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#7c3aed",
    marginTop: 12,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 8,
  },
  webUploadButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  webUploadButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  uploadsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  fileItem: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  fileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: "#6b7280",
  },
  processButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#7c3aed",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  processButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 8,
  },
  processingContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  processingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 16,
    textAlign: "center",
  },
  processingSubtext: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
  infoBox: {
    backgroundColor: "#f5f3ff",
    borderRadius: 12,
    padding: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#e9d5ff",
  },
  infoContent: {
    flex: 1,
    marginLeft: 12,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6b21a8",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#7c3aed",
    lineHeight: 20,
    marginBottom: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: 20,
  },
  titleInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  notesPreviewContainer: {
    flex: 1,
  },
  notesPreviewLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  notesPreviewScroll: {
    maxHeight: 400,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 16,
  },
  notesPreviewText: {
    fontSize: 14,
    color: "#111827",
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  modalButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  modalButtonSecondary: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  modalButtonPrimary: {
    backgroundColor: "#7c3aed",
  },
  modalButtonTextSecondary: {
    color: "#374151",
    fontSize: 16,
    fontWeight: "600",
  },
  modalButtonTextPrimary: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "80%",
  },
  mergeModalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 20,
    lineHeight: 20,
  },
  matchList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  matchItem: {
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  matchInfo: {
    flex: 1,
    marginLeft: 12,
  },
  matchTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  matchPreview: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
  createNewButton: {
    backgroundColor: "#7c3aed",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  createNewButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});