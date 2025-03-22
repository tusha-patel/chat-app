import { Download, File, Reply } from 'lucide-react';


const getFileType = (fileUrl) => {
    const extension = fileUrl.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return 'pdf';
    if (['zip', 'rar', '7z'].includes(extension)) return 'zip';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) return 'image';
    return 'other';
};

// Render file-specific UI
const renderFile = (file) => {
    // console.log(file);

    if (!file || !file.url) return null;

    const fileType = getFileType(file.name);
    let fileUrl = file.url;
    // const fileUrl = file.url.includes('.') ? file.url : `${file.url}.${file.name.split('.').pop()}`;

    switch (fileType) {
        case 'pdf':
            return (
                <a href={fileUrl} target="_blank" download={file.name} rel="noopener noreferrer" className="flex items-center gap-2 text-content hover:underline">
                    <File size={16} /> View PDF
                </a>
            );
        case 'zip':
            return (
                <a href={fileUrl} download={file.name} className="flex items-center gap-2 text-content hover:underline">
                    <Download size={16} /> {file.name}
                </a>
            );
        case 'image':
            return (
                <img src={fileUrl} alt="Attachment" download={file.name} className="sm:max-w-[200px] rounded-md mb-2" />
            );
        default:
            return (
                <a href={fileUrl} download={file.name} target="_blank" className="flex items-center gap-2 text-content/80  hover:underline">
                    <Download size={16} /> {file.name}
                </a>
            );
    }
};

export default renderFile;