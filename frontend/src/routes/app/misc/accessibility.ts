export function accessibleClickHandler(e: KeyboardEvent) {
    if (e.key === "Enter") {
        e.target?.dispatchEvent(new Event("click"));
    }
}