// app/modules/importExport.js

export async function importProject(file) {
    const txt = await file.text();
    let data;
    try {
        data = JSON.parse(txt);
        if (!data.meta || !data.lyrics) throw new Error('Invalid project data');
        return data;
    } catch (e) {
        throw new Error('Project file is invalid JSON or not in expected format.');
    }
}

export function exportProject(project) {
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.meta.title || 'karaoke_project'}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}