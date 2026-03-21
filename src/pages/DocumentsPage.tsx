import { FileText, Download, ExternalLink } from 'lucide-react';

const DOCUMENTS = [
  {
    id: 1,
    title: 'Ordonnance sur la formation professionnelle (OFPr)',
    type: 'Ordonnance fédérale',
    url: '#',
  },
  {
    id: 2,
    title: 'Loi fédérale complétant le Code civil suisse (Livre cinquième: Droit des obligations)',
    type: 'Loi fédérale',
    url: '#',
  },
];

export default function DocumentsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Documents</h1>
        <p className="text-gray-600">Recherche un mot-clé dans les documents de référence.</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Rechercher dans tous les documents..."
            className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-md transition">
            Rechercher
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {DOCUMENTS.map((doc) => (
          <div key={doc.id} className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 flex-1">
                <FileText className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{doc.title}</h3>
                  <p className="text-sm text-gray-600 mb-4">{doc.type}</p>
                  <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md transition">
                      <Download size={16} />
                      Lire dans l'app
                    </button>
                    <button className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium px-4 py-2 rounded-md transition">
                      <ExternalLink size={16} />
                      Ouvrir
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
