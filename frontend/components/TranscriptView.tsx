interface TranscriptViewProps {
    transcript: string;
}

export default function TranscriptView({ transcript }: TranscriptViewProps) {
    return (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="whitespace-pre-wrap text-sm text-gray-800">{transcript}</p>
        </div>
    );
}
