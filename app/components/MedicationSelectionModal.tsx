import { useState, useEffect } from "react";
import { medicationService } from "~/services/medication.service";
import type { Medication } from "~/services/medication.service";

interface MedicationSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (medication: Medication) => void;
}

export default function MedicationSelectionModal({
  isOpen,
  onClose,
  onSelect,
}: MedicationSelectionModalProps) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchMedications = async () => {
      setIsLoading(true);
      try {
        const response = await medicationService.getPatientMedications();
        if (response.success) {
          setMedications(response.data);
        } else {
          setError("Failed to load medications");
        }
      } catch (err) {
        console.error("Error fetching medications:", err);
        setError("Failed to load medications");
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchMedications();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Select Medication
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {medications.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No medications found</p>
                  <p className="text-sm text-gray-400 mt-2">
                    Add medications to set reminders
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {medications.map((medication) => (
                    <button
                      key={medication._id}
                      onClick={() => onSelect(medication)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left">
                      <h3 className="font-medium text-gray-900">
                        {medication.brandName}
                      </h3>
                      {medication.genericName && (
                        <p className="text-sm text-gray-500">
                          {medication.genericName}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 mt-1">
                        {medication.dosage}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 