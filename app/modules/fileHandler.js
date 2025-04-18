// app/modules/fileHandler.js
// Handles loading files (audio, lyrics, image) and importing projects

import * as UI from './ui.js';
import * as AssetManager from './assetManager.js';
import * as LyricsEditor from './lyricsEditor.js'; // Direct import OK here for parsing
import * as ImportExport from './importExport.js';
import * as ProjectController from './projectController.js';
import * as Customization from './customization.js'; // For theme extraction

// Store the original audio file name upon file input selection
let lastUploadedAudioFileName = null;

// Enhance: When the user chooses an audio file, update the "Song Name" input immediately
if (UI.elements.audioUpload) {
    UI.elements.audioUpload.addEventListener('change', () => {
        const audioFile = UI.elements.audioUpload.files[0];
        if (audioFile) {
            lastUploadedAudioFileName = audioFile.name;
            // Set the song name input to audio file's name minus extension
            const noExt = audioFile.name.replace(/\.[^/.]+$/, '');
            if (UI.elements.projectNameInput) {
                // Only set if blank or not touched/set
                if (!UI.elements.projectNameInput.value.trim() || UI.elements.projectNameInput.value === lastUploadedAudioFileName) {
                    UI.elements.projectNameInput.value = noExt;
                }
            }
        }
    });
}

export async function handleLoadNewSong() {
    const audioFile = UI.elements.audioUpload.files[0];
    const lyricsFile = UI.elements.lyricsUpload.files[0];
    const imageFile = UI.elements.imageUpload.files[0];

    if (!audioFile) {
        alert("Please select an audio file.");
        return;
    }
    if (!lyricsFile) {
        alert("Please select a lyrics file.");
        return;
    }

    try {
        UI.setLoading(true, "Loading new song...");

        // Generate new project ID and basic structure via ProjectController
        const newProject = ProjectController.createNewProject();
        // Track original audio filename before it's passed to AssetManager (whose .id mangles the name)
        newProject.meta.originalAudioFilename = audioFile.name;

        const title = UI.elements.projectNameInput.value || audioFile.name.replace(/\.[^/.]+$/, "");
        ProjectController.updateProjectMetadata(newProject, { title });

        // Process and store assets
        const audioAsset = await AssetManager.addAsset(audioFile, 'audio');
        const lyricsText = await lyricsFile.text();
        let imageAsset = null;
        if (imageFile) {
            imageAsset = await AssetManager.addAsset(imageFile, 'image');
            ProjectController.updateProjectAssets(newProject, { image: imageAsset.id });
        }
        ProjectController.updateProjectAssets(newProject, { audio: audioAsset.id });

        // Also store original audio filename with asset for future flexible matching
        if (audioAsset) {
            audioAsset.originalFileName = audioFile.name;
        }

        // Parse Lyrics using LyricsEditor module directly is fine here
        const parsedLyrics = LyricsEditor.parseLyrics(lyricsText, lyricsFile.name);
        ProjectController.updateProjectLyrics(newProject, parsedLyrics);

        // Load the newly created project into the application state
        ProjectController.loadProject(newProject); // This triggers UI updates via ProjectController's logic

        // Reset file inputs
        UI.elements.audioUpload.value = '';
        UI.elements.lyricsUpload.value = '';
        UI.elements.imageUpload.value = '';
        UI.elements.projectNameInput.value = '';

        lastUploadedAudioFileName = null;

        console.log("New song loaded:", newProject);

    } catch (error) {
        console.error("Error loading new song:", error);
        alert(`Failed to load song: ${error.message}`);
    } finally {
        UI.setLoading(false);
    }
}


export async function handleImportProject(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        UI.setLoading(true, "Importing project...");
        const importedData = await ImportExport.importProject(file); // ImportExport handles parsing/validation
        if (importedData) {
            // Verify assets are available in the session
            const audioNeededId = importedData.assets.audio;
            const imageNeededId = importedData.assets.image;

            let audioAsset = AssetManager.findAssetById(audioNeededId);
            let imageAsset = imageNeededId ? AssetManager.findAssetById(imageNeededId) : null;

            // Flexible check: Also allow matching by originalFileName if IDs do not match
            let requireUserConfirm = false;
            let sessionAudioAssets = (window.KaraokeEditor?.AssetManager?.audioAssets || []).concat(
                window.KaraokeEditor?.AssetManager?.imageAssets || []
            );

            // Check audio
            if (!audioAsset && importedData.meta?.originalAudioFilename) {
                // Try to find a loaded asset with same original file name (flexible, not strict match)
                audioAsset = (sessionAudioAssets || []).find(a =>
                    a.originalFileName === importedData.meta.originalAudioFilename
                );
                if (audioAsset) {
                    requireUserConfirm = true;
                    // Patch the import to use this asset
                    importedData.assets.audio = audioAsset.id;
                }
            }

            // Check image similarly if needed
            if (imageNeededId && !imageAsset && importedData.assets?.originalImageFileName) {
                imageAsset = (sessionAudioAssets || []).find(a =>
                    a.originalFileName === importedData.assets.originalImageFileName
                );
                if (imageAsset) {
                    requireUserConfirm = true;
                    importedData.assets.image = imageAsset.id;
                }
            }

            // If still missing, error (for audio at least)
            if (!audioAsset) {
                let msg = `Missing required audio asset ID: "${audioNeededId}".`;
                if (importedData.meta?.originalAudioFilename) {
                    msg += `\nIf you have the correct song file, try uploading it using the "Audio (MP3)" field.\nExpected filename: "${importedData.meta.originalAudioFilename}"`;
                }
                throw new Error(msg);
            }

            if (requireUserConfirm) {
                let warnMsg =
                    "The audio file name in the imported project does not exactly match any loaded audio files.\n" +
                    "However, we found a file in your session with the same original filename.\n" +
                    "The timings may not be correct if this is a different file!\n\n" +
                    `Project expects: "${importedData.meta?.originalAudioFilename || '[unknown]'}"\n` +
                    `Using in-session file: "${audioAsset.originalFileName || audioAsset.name || '[unknown]'}"\n` +
                    "Continue loading with this file?";
                if (!window.confirm(warnMsg)) {
                    UI.setLoading(false);
                    event.target.value = '';
                    return;
                }
            }

            // Assets verified/found, load the project via ProjectController
            ProjectController.loadProject(importedData, true); // Pass true to indicate it's an import and should be saved to history

            alert(`Project "${importedData.meta.title}" imported successfully!`);
        }
    } catch (error) {
        console.error("Error importing project:", error);
        alert(`Failed to import project: ${error.message}`);
    } finally {
        UI.setLoading(false);
        event.target.value = ''; // Reset file input
    }
}