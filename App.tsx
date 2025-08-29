import React, { useState, useCallback } from 'react';
import { ImageFile, LogEntry } from './types';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { analyzeReferenceImages, replaceProductInImage } from './services/geminiService';
import { UploadIcon, XCircleIcon, SparklesIcon, ExclamationTriangleIcon, HandThumbUpIcon, HandThumbDownIcon, InformationCircleIcon, DocumentTextIcon, ExclamationCircleIcon } from './components/IconComponents';
import { LogPanel } from './components/LogPanel';

const App: React.FC = () => {
    const [productImages, setProductImages] = useState<ImageFile[]>([]);
    const [marketingImage, setMarketingImage] = useState<ImageFile | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingMessage, setLoadingMessage] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [resultText, setResultText] = useState<string | null>(null);
    const [qualityCheck, setQualityCheck] = useState<string | null>(null);
    const [showRejectionForm, setShowRejectionForm] = useState(false);
    const [rejectionFeedback, setRejectionFeedback] = useState("");
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);
    const [showImageWarning, setShowImageWarning] = useState<boolean>(false);
    const [imageWarning, setImageWarning] = useState<string>('');

    const handleProductFilesSelect = useCallback((files: ImageFile[]) => {
        setProductImages(prev => [...prev, ...files].slice(0, 5));
    }, []);

    const handleMarketingFileSelect = useCallback((files: ImageFile[]) => {
        if (files.length > 0) {
            setMarketingImage(files[0]);
        }
    }, []);

    const removeProductImage = (index: number) => {
        setProductImages(prev => prev.filter((_, i) => i !== index));
    };

    const removeMarketingImage = () => {
        setMarketingImage(null);
    };
    
    const startGenerationProcess = async (feedback?: string) => {
        if (!marketingImage) return;
        
        setIsLoading(true);
        setError(null);
        setShowImageWarning(false);
        setImageWarning('');

        try {
            const result = await replaceProductInImage(productImages, marketingImage, feedback, setLoadingMessage);
            if (result.image) {
                setResultImage(`data:image/png;base64,${result.image}`);
            }
            if(result.text) {
                setResultText(result.text);
            }
            if (result.qualityCheck) {
                setQualityCheck(result.qualityCheck);
            }
            if (result.logs) {
                setLogs(prev => [...prev, ...result.logs]);
            }
            if(!result.image && !result.text) {
                 setError('The AI model did not return an image or text. Please try again.');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred.");
            console.error(err);
        } finally {
            setIsLoading(false);
            setLoadingMessage('');
        }
    };


    const handleGenerate = async () => {
        if (!marketingImage || productImages.length === 0) {
            setError("Please upload at least one product image and a marketing image.");
            return;
        }
        
        // Reset everything for a new run
        setIsLoading(true);
        setLoadingMessage('Step 1/4: Checking reference image quality...');
        setError(null);
        setResultImage(null);
        setResultText(null);
        setQualityCheck(null);
        setShowRejectionForm(false);
        setRejectionFeedback("");
        setLogs([]);
        setShowImageWarning(false);
        setImageWarning('');

        try {
            const analysis = await analyzeReferenceImages(productImages);
            setLogs([analysis.log]); // Set the first log entry

            if (analysis.areImagesSuitable) {
                // If images are good, proceed directly to the main 3-step process.
                await startGenerationProcess();
            } else {
                // If images are not suitable, show a warning and wait for user input.
                setImageWarning(analysis.reasoning);
                setShowImageWarning(true);
                setIsLoading(false); // Stop loading animation
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unknown error occurred during image quality analysis.");
            setIsLoading(false);
        }
    };
    
    const handleContinueAnyway = () => {
        setShowImageWarning(false);
        startGenerationProcess();
    };

    const handleCancelFromWarning = () => {
        setShowImageWarning(false);
        setImageWarning('');
    };

    const handleApprove = () => {
        // Reset for the next job
        setResultImage(null);
        setResultText(null);
        setMarketingImage(null);
        setProductImages([]);
        setQualityCheck(null);
        setShowRejectionForm(false);
        setRejectionFeedback("");
        setError(null);
        setLogs([]);
        setIsLogPanelOpen(false);
        setShowImageWarning(false);
        setImageWarning('');
    };

    const handleRetryWithFeedback = () => {
        if (rejectionFeedback.trim()) {
            // Clear previous results before retrying
            setResultImage(null);
            setResultText(null);
            setQualityCheck(null);
            setShowRejectionForm(false);
            // We pass the feedback to the generation process
            startGenerationProcess(rejectionFeedback);
            setRejectionFeedback("");
        }
    };
    
    const isGenerateDisabled = !marketingImage || productImages.length === 0 || isLoading;

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column: Inputs */}
                    <div className="flex flex-col gap-8">
                        {/* Step 1: Product Images */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
                            <h2 className="text-xl font-bold text-cyan-400 mb-1">Step 1: Upload Your Product Images</h2>
                            <p className="text-sm text-gray-400 mb-4">Add 1 to 5 clear images of your product against a clean background.</p>
                            <ImageUploader onFilesSelect={handleProductFilesSelect} multiple={true} disabled={productImages.length >= 5} />
                            {productImages.length > 0 && (
                                <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-4">
                                    {productImages.map((img, index) => (
                                        <div key={index} className="relative group aspect-square">
                                            <img src={img.base64} alt={`Product ${index + 1}`} className="w-full h-full object-cover rounded-md border-2 border-gray-600"/>
                                            <button onClick={() => removeProductImage(index)} className="absolute -top-2 -right-2 bg-gray-800 rounded-full text-red-500 hover:text-red-400 transition-transform duration-200 transform group-hover:scale-110">
                                                <XCircleIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Step 2: Marketing Image */}
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg">
                             <h2 className="text-xl font-bold text-cyan-400 mb-1">Step 2: Upload Marketing Image</h2>
                            <p className="text-sm text-gray-400 mb-4">Add the ad creative where you want to replace the product.</p>
                            {!marketingImage ? (
                                <ImageUploader onFilesSelect={handleMarketingFileSelect} multiple={false} />
                            ) : (
                                <div className="mt-4 relative group">
                                    <img src={marketingImage.base64} alt="Marketing creative" className="w-full h-auto object-contain rounded-md border-2 border-gray-600 max-h-96"/>
                                     <button onClick={removeMarketingImage} className="absolute -top-2 -right-2 bg-gray-800 rounded-full text-red-500 hover:text-red-400 transition-transform duration-200 transform group-hover:scale-110">
                                        <XCircleIcon className="w-8 h-8" />
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Action Button */}
                         <button
                            onClick={handleGenerate}
                            disabled={isGenerateDisabled}
                            className={`w-full flex items-center justify-center gap-3 text-lg font-bold py-4 px-6 rounded-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
                                isGenerateDisabled
                                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg hover:shadow-cyan-500/50'
                            }`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    {loadingMessage}
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-6 h-6"/>
                                    Replace Product
                                </>
                            )}
                        </button>
                    </div>

                    {/* Right Column: Output */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-lg flex flex-col items-center justify-center min-h-[400px]">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4 self-start">Result</h2>
                        <div className="w-full h-full flex-grow flex flex-col items-center justify-center">
                            {isLoading && (
                                <div className="w-full max-w-md mx-auto">
                                  <div className="animate-pulse flex flex-col items-center space-y-4">
                                    <div className="rounded-lg bg-gray-700 h-64 w-full"></div>
                                    <div className="h-4 bg-gray-700 rounded w-5/6"></div>
                                    <div className="h-4 bg-gray-700 rounded w-3/4"></div>
                                  </div>
                                </div>
                            )}
                            {error && (
                               <div className="text-center text-red-400 bg-red-900/20 border border-red-500 p-4 rounded-lg">
                                    <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-2"/>
                                    <p className="font-bold">An Error Occurred</p>
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}
                            {showImageWarning && !isLoading && (
                                <div className="text-center text-yellow-300 bg-yellow-900/30 border border-yellow-500 p-6 rounded-lg max-w-md">
                                    <ExclamationCircleIcon className="w-12 h-12 mx-auto mb-3 text-yellow-400"/>
                                    <p className="font-bold text-lg mb-2">Image Quality Warning</p>
                                    <p className="text-sm mb-6">{imageWarning}</p>
                                    <div className="flex justify-center gap-4">
                                        <button 
                                            onClick={handleCancelFromWarning}
                                            className="px-6 py-2 text-sm font-medium text-gray-200 bg-gray-600 rounded-md hover:bg-gray-500 transition-colors">
                                            Cancel
                                        </button>
                                        <button 
                                            onClick={handleContinueAnyway}
                                            className="px-6 py-2 text-sm font-medium text-white bg-yellow-600 rounded-md hover:bg-yellow-700 transition-colors flex items-center gap-2">
                                            Continue Anyway
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!isLoading && !error && !showImageWarning && resultImage && (
                                <div className="w-full">
                                    <img src={resultImage} alt="Generated result" className="w-full h-auto object-contain rounded-lg border-2 border-cyan-500"/>
                                    {resultText && <p className="mt-4 text-gray-300 italic p-3 bg-gray-900/50 rounded-md">{resultText}</p>}
                                    
                                    {qualityCheck && (
                                        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                                            <h3 className="flex items-center gap-2 font-semibold text-cyan-400 mb-2">
                                                <InformationCircleIcon className="w-6 h-6" />
                                                AI Quality Check
                                            </h3>
                                            <p className="text-sm text-gray-300">{qualityCheck}</p>
                                        </div>
                                    )}
                                    
                                    {showRejectionForm ? (
                                        <div className="mt-4 p-4 bg-gray-700/50 rounded-lg w-full">
                                            <label htmlFor="feedback" className="block text-sm font-medium text-gray-300 mb-2">Why are you rejecting this image? (Optional but helpful)</label>
                                            <textarea
                                                id="feedback"
                                                rows={3}
                                                value={rejectionFeedback}
                                                onChange={(e) => setRejectionFeedback(e.target.value)}
                                                className="w-full bg-gray-800 border-gray-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                                                placeholder="e.g., The product is too small, the lighting is wrong..."
                                            />
                                            <div className="flex justify-end gap-3 mt-3">
                                                <button onClick={() => setShowRejectionForm(false)} className="px-4 py-2 text-sm font-medium text-gray-300 bg-gray-600 rounded-md hover:bg-gray-500">Cancel</button>
                                                <button onClick={handleRetryWithFeedback} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 flex items-center gap-2">
                                                    <SparklesIcon className="w-4 h-4" />
                                                    Retry with Feedback
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-4 flex justify-center items-center gap-4">
                                            <button onClick={handleApprove} className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                                                <HandThumbUpIcon className="w-6 h-6"/>
                                                Approve
                                            </button>
                                            <button onClick={() => setShowRejectionForm(true)} className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-transform transform hover:scale-105">
                                                <HandThumbDownIcon className="w-6 h-6"/>
                                                Reject
                                            </button>
                                            {logs.length > 0 && (
                                                <button onClick={() => setIsLogPanelOpen(true)} title="View Process Log" className="p-3 bg-gray-700 hover:bg-gray-600 text-cyan-400 font-bold rounded-lg transition-transform transform hover:scale-105">
                                                   <DocumentTextIcon className="w-6 h-6" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                            {!isLoading && !error && !resultImage && !showImageWarning && (
                                <div className="text-center text-gray-500">
                                    <SparklesIcon className="w-16 h-16 mx-auto mb-4"/>
                                    <p className="text-lg">Your generated image will appear here.</p>
                                    <p className="text-sm">Complete the steps and click "Replace Product".</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <LogPanel logs={logs} isOpen={isLogPanelOpen} onClose={() => setIsLogPanelOpen(false)} />
        </div>
    );
};

export default App;