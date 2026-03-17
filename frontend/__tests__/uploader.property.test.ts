/**
 * Property 1: File format validation
 * Validates: Requirements 2.1, 2.4
 *
 * validateAudioFile must accept only audio/mpeg, audio/wav, audio/mp4,
 * audio/x-m4a and reject everything else with the correct error message.
 * Files over 500 MB must be rejected regardless of type.
 */
import fc from "fast-check";
import { validateAudioFile } from "@/components/Uploader";

const ALLOWED_MIME = ["audio/mpeg", "audio/wav", "audio/mp4", "audio/x-m4a"];
const ALLOWED_EXT = ["mp3", "wav", "m4a"];
const MAX_BYTES = 500 * 1024 * 1024;

function makeFile(name: string, type: string, size: number): File {
    // File constructor: new File(parts, name, options)
    const blob = new Blob(["x".repeat(Math.min(size, 1))], { type });
    return new File([blob], name, { type }) as unknown as File & { size: number };
}

// Override size since Blob content is truncated in tests
function makeFileWithSize(name: string, type: string, size: number): File {
    const file = makeFile(name, type, 1);
    Object.defineProperty(file, "size", { value: size });
    return file;
}

test("Property 1a: allowed MIME types are accepted", () => {
    fc.assert(
        fc.property(
            fc.constantFrom(...ALLOWED_MIME),
            fc.constantFrom(...ALLOWED_EXT),
            (mime, ext) => {
                const file = makeFileWithSize(`recording.${ext}`, mime, 1024);
                expect(validateAudioFile(file)).toBeNull();
            }
        ),
        { numRuns: 20 }
    );
});

test("Property 1b: disallowed MIME types are rejected with correct message", () => {
    fc.assert(
        fc.property(
            fc.string({ minLength: 1, maxLength: 30 }).filter(
                (s) => !ALLOWED_MIME.includes(s) && !s.includes("/")
            ),
            (badMime) => {
                const mime = `application/${badMime}`;
                const file = makeFileWithSize("recording.xyz", mime, 1024);
                const result = validateAudioFile(file);
                expect(result).toBe(
                    "Unsupported format. Please upload an MP3, WAV, or M4A file."
                );
            }
        ),
        { numRuns: 20 }
    );
});

test("Property 1c: files over 500 MB are rejected", () => {
    fc.assert(
        fc.property(
            fc.constantFrom(...ALLOWED_MIME),
            fc.constantFrom(...ALLOWED_EXT),
            fc.integer({ min: MAX_BYTES + 1, max: MAX_BYTES + 1_000_000 }),
            (mime, ext, size) => {
                const file = makeFileWithSize(`recording.${ext}`, mime, size);
                const result = validateAudioFile(file);
                expect(result).toBe(
                    "File exceeds the 500 MB limit. Please compress or trim the recording."
                );
            }
        ),
        { numRuns: 20 }
    );
});
