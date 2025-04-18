// app/modules/fileHandler.js
// Handles loading files (audio, lyrics, image) and importing projects

import * as UI from './ui.js';
import * as AssetManager from './assetManager.js';
import * as LyricsEditor from './lyricsEditor.js'; // Direct import OK here for parsing
import * as ImportExport from './importExport.js';
import * as ProjectController from './projectController.js';
import * as Customization from './customization.js'; // For theme extraction

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
            const audioNeeded = importedData.assets.audio;
            const imageNeeded = importedData.assets.image;

            const audioAsset = AssetManager.findAssetById(audioNeeded);
            let imageAsset = imageNeeded ? AssetManager.findAssetById(imageNeeded) : null;

            if (!audioAsset) {
                 // Instead of alert, could trigger UI to prompt for file association
                throw new Error(`Missing required audio asset ID: "${audioNeeded}". Please ensure the corresponding audio file is loaded in this session.`);
            }
            if (imageNeeded && !imageAsset) {
                throw new Error(`Missing required image asset ID: "${imageNeeded}". Please ensure the corresponding image file is loaded in this session.`);
            }

            // Assets verified, load the project via ProjectController
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