
// format the date
export function formatMessageTime(date) {
    return new Date(date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

export function formatMessageDay(date) {
    const messageDate = new Date(date);
    const now = new Date();

    const isToday =
        messageDate.getDate() === now.getDate() &&
        messageDate.getMonth() === now.getMonth() &&
        messageDate.getFullYear() === now.getFullYear();

    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);

    const isYesterday =
        messageDate.getDate() === yesterday.getDate() &&
        messageDate.getMonth() === yesterday.getMonth() &&
        messageDate.getFullYear() === yesterday.getFullYear();

    let dateLabel = isToday
        ? "Today"
        : isYesterday
            ? "Yesterday"
            : messageDate.toLocaleDateString("en-US"); // MM/DD/YYYY format

    let time = messageDate.toLocaleString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
    });

    return `${dateLabel}, ${time}`;
}