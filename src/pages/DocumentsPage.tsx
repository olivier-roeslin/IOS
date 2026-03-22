import { useState, useEffect } from 'react';
import { FileText, ExternalLink, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { useLanguage } from '../lib/LanguageContext';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const DOCUMENTS = [
  {
    id: 1,
    title: 'Ordonnance sur la formation professionnelle (OFPr)',
    type: 'Ordonnance fédérale',
    file: '/pdfs/document1.pdf',
  },
  {
    id: 2,
    title: 'Loi fédérale complétant le Code civil suisse (Livre cinquième: Droit des obligations)',
    type: 'Loi fédérale',
    file: '/pdfs/document2.pdf',
  },
];

export default function DocumentsPage() {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchResults, setSearchResults] = useState([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const handleDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const openInApp = (doc) => {
    setSelectedDoc(doc);
    setSearchTerm('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  const openExternal = (doc) => {
    window.open(doc.file, '_blank');
  };

  const closeViewer = () => {
    setSelectedDoc(null);
    setSearchTerm('');
    setSearchResults([]);
    setCurrentSearchIndex(0);
  };

  const handleSearch = async () => {
    if (!searchTerm.trim() || !selectedDoc) return;

    setIsSearching(true);
    const results = [];

    try {
      const loadingTask = pdfjs.getDocument(selectedDoc.file);
      const pdf = await loadingTask.promise;

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ').toLowerCase();

        if (text.includes(searchTerm.toLowerCase())) {
          const count = (text.match(new RegExp(searchTerm.toLowerCase(), 'g')) || []).length;
          results.push({ page: i, count });
        }
      }

      setSearchResults(results);
      setCurrentSearchIndex(0);
      if (results.length > 0) {
        setPageNumber(results[0].page);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    setPageNumber(searchResults[nextIndex].page);
  };

  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    setPageNumber(searchResults[prevIndex].page);
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === 'Enter' && searchResults.length > 0) {
        nextSearchResult();
      }
    };

    window.addEventListener('keypress', handleKeyPress);
    return () => window.removeEventListener('keypress', handleKeyPress);
  }, [searchResults, currentSearchIndex]);

  if (selectedDoc) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={closeViewer}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              <ChevronLeft size={20} />
              {t.documents.backToDocuments}
            </button>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex-1 mx-4">{selectedDoc.title}</h2>
          </div>

          <div className="flex gap-3 items-center">
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder={t.documents.searchPlaceholder}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md transition disabled:opacity-50 flex items-center gap-2"
              >
                <Search size={18} />
                {isSearching ? t.documents.searching : t.documents.searchButton}
              </button>
            </div>

            {searchResults.length > 0 && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-gray-900 px-4 py-2 rounded-md">
                <button onClick={prevSearchResult} className="text-blue-600 hover:text-blue-700">
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentSearchIndex + 1}/{searchResults.length}
                </span>
                <button onClick={nextSearchResult} className="text-blue-600 hover:text-blue-700">
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setSearchResults([]);
                    setCurrentSearchIndex(0);
                  }}
                  className="ml-2 text-gray-500 hover:text-gray-700"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPageNumber(Math.max(1, pageNumber - 1))}
                disabled={pageNumber <= 1}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {t.documents.page} {pageNumber} / {numPages || '?'}
              </span>
              <button
                onClick={() => setPageNumber(Math.min(numPages || 1, pageNumber + 1))}
                disabled={pageNumber >= (numPages || 1)}
                className="p-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md disabled:opacity-50"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex-1 overflow-auto flex justify-center">
          <Document
            file={selectedDoc.file}
            onLoadSuccess={handleDocumentLoadSuccess}
            className="max-w-full"
          >
            <Page pageNumber={pageNumber} width={800} />
          </Document>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.documents.title}</h1>
        <p className="text-gray-600 dark:text-gray-400">{t.documents.description}</p>
      </div>

      <div className="space-y-4">
        {DOCUMENTS.map((doc) => (
          <div key={doc.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 flex-1">
                <FileText className="text-blue-600 flex-shrink-0" size={24} />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{doc.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{doc.type}</p>
                  <div className="flex gap-3">
                    <button
                      onClick={() => openInApp(doc)}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
                    >
                      <FileText size={16} />
                      {t.documents.readInApp}
                    </button>
                    <button
                      onClick={() => openExternal(doc)}
                      className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-md transition"
                    >
                      <ExternalLink size={16} />
                      {t.documents.open}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
