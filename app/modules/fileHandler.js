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
            // Try both: By ID and by original file name (case-insensitive)!
            // Collect all session audio and image assets
            const sessionAudioAssets = window.KaraokeEditor?.AssetManager?.audioAssets || [];
            const sessionImageAssets = window.KaraokeEditor?.AssetManager?.imageAssets || [];

            // ---- AUDIO MATCHING ----
            let audioAsset = null;
            // Try to match by asset id (importedData.assets.audio)
            if (importedData.assets && importedData.assets.audio) {
                audioAsset = sessionAudioAssets.find(a => a.id === importedData.assets.audio);
            }
            // If no match by id, try matching by original filename (case-insensitive)
            if (!audioAsset && importedData.meta?.originalAudioFilename) {
                audioAsset = sessionAudioAssets.find(a =>
                    a.originalFileName && a.originalFileName.toLowerCase() === importedData.meta.originalAudioFilename.toLowerCase()
                );
                // If found, patch importedData asset id to use found asset (for compatibility in session)
                if (audioAsset) {
                    importedData.assets.audio = audioAsset.id;
                }
            }
            // Extra: Try matching by filename (from id, removing prefix/junk)
            if (!audioAsset && importedData.assets?.audio) {
                // Attempt to match by file name only, ignoring id/random prefix
                const importedAudioBase = importedData.assets.audio.split('_').slice(-1)[0];
                audioAsset = sessionAudioAssets.find(a =>
                    a.name && a.name.toLowerCase() === importedAudioBase.toLowerCase()
                );
                if (audioAsset) {
                    importedData.assets.audio = audioAsset.id;
                }
            }

            // ---- IMAGE MATCHING ----
            let imageAsset = null;
            if (importedData.assets && importedData.assets.image) {
                imageAsset = sessionImageAssets.find(a => a.id === importedData.assets.image);
            }
            // Try matching by original file name, case-insensitive
            if (!imageAsset && importedData.assets?.originalImageFileName) {
                imageAsset = sessionImageAssets.find(a =>
                    a.originalFileName && a.originalFileName.toLowerCase() === importedData.assets.originalImageFileName.toLowerCase()
                );
                if (imageAsset) {
                    importedData.assets.image = imageAsset.id;
                }
            }
            // Try matching by file name from id
            if (!imageAsset && importedData.assets?.image) {
                const importedImageBase = importedData.assets.image.split('_').slice(-1)[0];
                imageAsset = sessionImageAssets.find(a =>
                    a.name && a.name.toLowerCase() === importedImageBase.toLowerCase()
                );
                if (imageAsset) {
                    importedData.assets.image = imageAsset.id;
                }
            }

            // ---- USER FEEDBACK ----
            let requireUserConfirm = false;
            let audioWarning = '';
            if (!audioAsset) {
                audioWarning = `Missing required audio asset ID: "${importedData.assets?.audio}"`;
                // Tell user we will allow forcibly linking to any other in-session audio file with matching file name
                if (sessionAudioAssets.length) {
                    // Try to prompt with files they can re-link
                    const availableNames = sessionAudioAssets.map(a => `"${a.originalFileName || a.name}"`).join(', ');
                    audioWarning += `\n\nYou have audio files loaded in this session: ${availableNames}\n\nThe project expects:\n  "${importedData.meta?.originalAudioFilename || importedData.assets?.audio}"\nIf one of your loaded files is actually the same song, you can rename it before import, or try re-uploading it with a matching name.`;
                } else {
                    audioWarning += `\nPlease load a matching audio file using 'Load Files' before importing.`;
                }
                throw new Error(audioWarning);
            } else if (audioAsset.originalFileName && importedData.meta?.originalAudioFilename &&
                audioAsset.originalFileName.toLowerCase() !== importedData.meta.originalAudioFilename.toLowerCase()
            ) {
                requireUserConfirm = true;
                audioWarning =
                    "The audio file linked for this project is NOT the exact same original filename expected by the song's timing.\n" +
                    `Expected: "${importedData.meta.originalAudioFilename}"\n` +
                    `Using:    "${audioAsset.originalFileName}"\n` +
                    "The timings and playback may not match your lyrics. Continue anyway?";
            }

            if (requireUserConfirm && !window.confirm(audioWarning)) {
                UI.setLoading(false);
                event.target.value = '';
                return;
            }

            // ---- LOAD PROJECT ----
            ProjectController.loadProject(importedData, true); // Mark as imported, save to history

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