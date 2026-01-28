"use client";

import { useState, useEffect, useMemo } from "react";
import { apiClient, type Agent, type AgentUpdate, type AIModel } from "@/lib/api";
import { useAuth } from "@/lib/supabase";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";
import SettingsIcon from "@mui/icons-material/Settings";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import TuneIcon from "@mui/icons-material/Tune";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SchoolIcon from "@mui/icons-material/School";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import EditIcon from "@mui/icons-material/Edit";

interface AgentConfigPanelProps {
  agent: Agent;
  onBack: () => void;
  onSave: (agent: Agent) => void;
}

type TabType = "general" | "prompt" | "model" | "capabilities" | "knowledge" | "subagents";

interface KnowledgeEntry {
  id: string;
  content: string;
  document_type: string;
  isNew?: boolean;
}

interface SubAgent {
  id: string;
  parent_agent_id: string;
  organization_id: string;
  name: string;
  slug: string;
  role: string;
  description?: string;
  icon: string;
  ai_model: string;
  temperature: number;
  max_tokens: number;
  system_prompt?: string;
  capabilities: {
    rag_enabled: boolean;
    web_search: boolean;
    code_execution: boolean;
    image_generation: boolean;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function AgentConfigPanel({ agent, onBack, onSave }: AgentConfigPanelProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  // Sub-agents state
  const [subAgents, setSubAgents] = useState<SubAgent[]>([]);
  const [isLoadingSubAgents, setIsLoadingSubAgents] = useState(false);
  const [selectedSubAgent, setSelectedSubAgent] = useState<SubAgent | null>(null);

  // Form state
  const [formData, setFormData] = useState<AgentUpdate>({
    name: agent.name,
    role: agent.role,
    description: agent.description || "",
    icon: agent.icon,
    system_prompt: agent.system_prompt || "",
    is_active: agent.is_active,
    ai_model: agent.ai_model,
    temperature: agent.temperature,
    max_tokens: agent.max_tokens,
    welcome_message: agent.welcome_message || "",
    capabilities: { ...agent.capabilities },
    category: agent.category,
  });

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    return (
      formData.name !== agent.name ||
      formData.role !== agent.role ||
      formData.description !== (agent.description || "") ||
      formData.icon !== agent.icon ||
      formData.system_prompt !== (agent.system_prompt || "") ||
      formData.is_active !== agent.is_active ||
      formData.ai_model !== agent.ai_model ||
      formData.temperature !== agent.temperature ||
      formData.max_tokens !== agent.max_tokens ||
      formData.welcome_message !== (agent.welcome_message || "") ||
      formData.category !== agent.category ||
      JSON.stringify(formData.capabilities) !== JSON.stringify(agent.capabilities)
    );
  }, [formData, agent]);

  // Load available models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await apiClient.getAvailableModels();
        setAvailableModels(response.models);
      } catch (err) {
        console.error("Failed to load models:", err);
        // Fallback models
        setAvailableModels([
          { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", max_tokens: 128000, supports_vision: true, supports_functions: true, is_available: true },
          { id: "gpt-4o", name: "GPT-4o", provider: "openai", max_tokens: 128000, supports_vision: true, supports_functions: true, is_available: true },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", max_tokens: 16385, supports_vision: false, supports_functions: true, is_available: true },
        ]);
      }
    };
    loadModels();
  }, []);

  // Show confirmation dialog before saving
  const handleSaveClick = () => {
    if (!hasChanges) {
      setError("No hay cambios para guardar");
      setTimeout(() => setError(null), 3000);
      return;
    }
    setShowConfirmDialog(true);
  };

  // Actually save the changes after confirmation
  const handleConfirmSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updatedAgent = await apiClient.updateAgent(agent.id, formData, user.id);
      setShowConfirmDialog(false);
      setSuccessMessage("Configuración guardada correctamente");
      onSave(updatedAgent);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setShowConfirmDialog(false);
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setIsSaving(false);
    }
  };

  // Cancel saving
  const handleCancelSave = () => {
    setShowConfirmDialog(false);
  };

  const tabs = [
    { id: "general" as TabType, label: "General", icon: <SettingsIcon fontSize="small" /> },
    { id: "prompt" as TabType, label: "System Prompt", icon: <MenuBookIcon fontSize="small" /> },
    { id: "knowledge" as TabType, label: "Knowledge Base", icon: <SchoolIcon fontSize="small" /> },
    { id: "subagents" as TabType, label: "Sub Agentes", icon: <GroupWorkIcon fontSize="small" /> },
    { id: "model" as TabType, label: "Modelo IA", icon: <SmartToyIcon fontSize="small" /> },
    { id: "capabilities" as TabType, label: "Capacidades", icon: <TuneIcon fontSize="small" /> },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-dark-800/50">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <ArrowBackIcon fontSize="small" />
          <span className="text-sm font-medium">Volver</span>
        </button>

        <div className="w-px h-6 bg-white/10" />

        <div className="flex items-center gap-3 flex-1">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-lg">
            {agent.icon}
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Configurar {agent.name}</h1>
            <p className="text-xs text-gray-500">v{agent.version || 1} - {agent.category}</p>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSaveClick}
          disabled={isSaving || !hasChanges}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 ${
            hasChanges
              ? "bg-purple-600 hover:bg-purple-700"
              : "bg-gray-600 cursor-not-allowed"
          }`}
        >
          <SaveIcon fontSize="small" />
          {hasChanges ? "Guardar cambios" : "Sin cambios"}
        </button>
      </header>

      {/* Messages */}
      {error && (
        <div className="mx-5 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mx-5 mt-4 bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-4 border-b border-white/10">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-all
              ${activeTab === tab.id
                ? "bg-white/5 text-white border-b-2 border-purple-500"
                : "text-gray-400 hover:text-white hover:bg-white/5"
              }
            `}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === "general" && (
          <GeneralTab formData={formData} setFormData={setFormData} />
        )}
        {activeTab === "prompt" && (
          <PromptTab formData={formData} setFormData={setFormData} />
        )}
        {activeTab === "model" && (
          <ModelTab
            formData={formData}
            setFormData={setFormData}
            availableModels={availableModels}
          />
        )}
        {activeTab === "capabilities" && (
          <CapabilitiesTab formData={formData} setFormData={setFormData} />
        )}
        {activeTab === "knowledge" && (
          <KnowledgeTab
            agentId={agent.id}
            organizationId={agent.organization_id}
            knowledgeEntries={knowledgeEntries}
            setKnowledgeEntries={setKnowledgeEntries}
            isLoading={isLoadingKnowledge}
            setIsLoading={setIsLoadingKnowledge}
            isSaving={isSavingKnowledge}
            setIsSaving={setIsSavingKnowledge}
          />
        )}
        {activeTab === "subagents" && (
          <SubAgentsTab
            agentId={agent.id}
            organizationId={agent.organization_id}
            subAgents={subAgents}
            setSubAgents={setSubAgents}
            isLoading={isLoadingSubAgents}
            setIsLoading={setIsLoadingSubAgents}
            selectedSubAgent={selectedSubAgent}
            setSelectedSubAgent={setSelectedSubAgent}
          />
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="Confirmar cambios"
        message="¿Seguro que quieres realizar estos cambios? La configuración del agente será actualizada inmediatamente."
        confirmText="Sí, guardar cambios"
        cancelText="Cancelar"
        onConfirm={handleConfirmSave}
        onCancel={handleCancelSave}
        isLoading={isSaving}
        variant="info"
      />
    </div>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

interface TabProps {
  formData: AgentUpdate;
  setFormData: React.Dispatch<React.SetStateAction<AgentUpdate>>;
}

function GeneralTab({ formData, setFormData }: TabProps) {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Nombre del Agente
        </label>
        <input
          type="text"
          value={formData.name || ""}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm"
          placeholder="Ej: Agent Copy"
        />
      </div>

      {/* Role */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Rol / Especialidad
        </label>
        <input
          type="text"
          value={formData.role || ""}
          onChange={(e) => setFormData({ ...formData, role: e.target.value })}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm"
          placeholder="Ej: Copywriting Specialist"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Descripción corta
        </label>
        <textarea
          value={formData.description || ""}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={2}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm resize-none"
          placeholder="Breve descripción de lo que hace el agente"
        />
      </div>

      {/* Icon */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Icono (Emoji)
        </label>
        <input
          type="text"
          value={formData.icon || ""}
          onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
          className="input-dark w-24 rounded-xl px-4 py-3 text-sm text-center text-2xl"
          placeholder=""
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Categoría
        </label>
        <select
          value={formData.category || "general"}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm"
        >
          <option value="general">General</option>
          <option value="marketing">Marketing</option>
          <option value="advertising">Publicidad</option>
          <option value="legal">Legal</option>
          <option value="support">Soporte</option>
          <option value="sales">Ventas</option>
        </select>
      </div>

      {/* Welcome Message */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Mensaje de Bienvenida
        </label>
        <textarea
          value={formData.welcome_message || ""}
          onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
          rows={2}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm resize-none"
          placeholder="Mensaje inicial cuando el usuario abre el chat"
        />
      </div>

      {/* Active Toggle */}
      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
        <div>
          <p className="text-sm font-medium text-white">Agente Activo</p>
          <p className="text-xs text-gray-500">Los usuarios pueden interactuar con este agente</p>
        </div>
        <button
          onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
          className={`
            relative w-12 h-6 rounded-full transition-colors
            ${formData.is_active ? "bg-purple-600" : "bg-gray-600"}
          `}
        >
          <span
            className={`
              absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
              ${formData.is_active ? "left-7" : "left-1"}
            `}
          />
        </button>
      </div>
    </div>
  );
}

function PromptTab({ formData, setFormData }: TabProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            System Prompt
          </label>
          <span className="text-xs text-gray-500">
            {(formData.system_prompt || "").length} caracteres
          </span>
        </div>
        <textarea
          value={formData.system_prompt || ""}
          onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
          rows={20}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm font-mono resize-none"
          placeholder="Define el comportamiento y personalidad del agente..."
        />
        <p className="mt-2 text-xs text-gray-500">
          Este es el prompt que define cómo se comporta el agente. Incluye su personalidad,
          conocimientos, limitaciones y formato de respuestas.
        </p>
      </div>

      {/* Prompt Templates */}
      <div className="p-4 bg-white/5 rounded-xl">
        <p className="text-sm font-medium text-white mb-3">Plantillas de Prompt</p>
        <div className="flex flex-wrap gap-2">
          {[
            "Copywriter",
            "Soporte",
            "Ventas",
            "Asistente General",
          ].map((template) => (
            <button
              key={template}
              className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 transition-colors"
            >
              {template}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

interface ModelTabProps extends TabProps {
  availableModels: AIModel[];
}

function ModelTab({ formData, setFormData, availableModels }: ModelTabProps) {
  const groupedModels = availableModels.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, AIModel[]>);

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-3">
          Modelo de IA
        </label>
        <div className="space-y-4">
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                {provider}
              </p>
              <div className="grid gap-2">
                {models.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setFormData({ ...formData, ai_model: model.id })}
                    className={`
                      flex items-center justify-between p-3 rounded-xl border transition-all text-left
                      ${formData.ai_model === model.id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                      }
                    `}
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{model.name}</p>
                      <p className="text-xs text-gray-500">{model.description}</p>
                    </div>
                    <div className="flex gap-2">
                      {model.supports_vision && (
                        <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                          Vision
                        </span>
                      )}
                      <span className="px-2 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
                        {(model.max_tokens / 1000).toFixed(0)}k
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Temperature */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Temperatura
          </label>
          <span className="text-sm text-purple-400">{formData.temperature}</span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={formData.temperature || 0.7}
          onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
          className="w-full accent-purple-500"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Preciso (0)</span>
          <span>Creativo (2)</span>
        </div>
      </div>

      {/* Max Tokens */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Máximo de Tokens de Respuesta
        </label>
        <input
          type="number"
          min="100"
          max="128000"
          step="100"
          value={formData.max_tokens || 2048}
          onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
          className="input-dark w-full rounded-xl px-4 py-3 text-sm"
        />
        <p className="mt-1 text-xs text-gray-500">
          Controla la longitud máxima de las respuestas del agente
        </p>
      </div>
    </div>
  );
}

interface KnowledgeTabProps {
  agentId: string;
  organizationId: string;
  knowledgeEntries: KnowledgeEntry[];
  setKnowledgeEntries: React.Dispatch<React.SetStateAction<KnowledgeEntry[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  isSaving: boolean;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

function KnowledgeTab({
  agentId,
  organizationId,
  knowledgeEntries,
  setKnowledgeEntries,
  isLoading,
  setIsLoading,
  isSaving,
  setIsSaving,
}: KnowledgeTabProps) {
  const [newContent, setNewContent] = useState("");
  const [newDocType, setNewDocType] = useState("general");
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing knowledge entries for this agent
  useEffect(() => {
    const loadKnowledge = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/knowledge/documents?organization_id=${organizationId}&agent_id=${agentId}`
        );
        if (response.ok) {
          const data = await response.json();
          setKnowledgeEntries(data.documents || []);
        }
      } catch (err) {
        console.error("Failed to load knowledge:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadKnowledge();
  }, [agentId, organizationId, setIsLoading, setKnowledgeEntries]);

  // Add new knowledge entry
  const handleAddEntry = async () => {
    if (!newContent.trim()) return;

    setIsSaving(true);
    setSaveMessage(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/knowledge/documents?organization_id=${organizationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agent_id: agentId,
            content: newContent.trim(),
            document_type: newDocType,
            metadata: { source: "admin_panel" },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKnowledgeEntries((prev) => [...prev, data]);
        setNewContent("");
        setSaveMessage({ type: "success", text: "Conocimiento agregado correctamente" });
        setTimeout(() => setSaveMessage(null), 3000);
      } else {
        const error = await response.json().catch(() => ({}));
        setSaveMessage({ type: "error", text: error.detail || "Error al guardar" });
      }
    } catch (err) {
      setSaveMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setIsSaving(false);
    }
  };

  // Delete knowledge entry
  const handleDeleteEntry = async (entryId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/knowledge/documents/${entryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setKnowledgeEntries((prev) => prev.filter((e) => e.id !== entryId));
        setSaveMessage({ type: "success", text: "Entrada eliminada" });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to delete entry:", err);
    }
  };

  const documentTypes = [
    { value: "general", label: "General" },
    { value: "product", label: "Productos" },
    { value: "faq", label: "FAQ" },
    { value: "policy", label: "Políticas" },
    { value: "brand", label: "Marca" },
  ];

  return (
    <div className="space-y-6">
      {/* Message */}
      {saveMessage && (
        <div
          className={`p-3 rounded-xl text-sm ${
            saveMessage.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Add New Entry */}
      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <AddIcon fontSize="small" />
          Agregar Conocimiento
        </h3>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Tipo de documento</label>
            <select
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value)}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm"
            >
              {documentTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Contenido</label>
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={6}
              className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono resize-none"
              placeholder="Escribe o pega el contenido que el agente debe conocer...&#10;&#10;Ejemplo:&#10;- Información de productos&#10;- Políticas de la empresa&#10;- FAQs frecuentes&#10;- Datos de la marca"
            />
          </div>

          <button
            onClick={handleAddEntry}
            disabled={isSaving || !newContent.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
          >
            {isSaving ? (
              <>
                <span className="animate-spin">⏳</span>
                Guardando...
              </>
            ) : (
              <>
                <AddIcon fontSize="small" />
                Agregar al Knowledge Base
              </>
            )}
          </button>
        </div>
      </div>

      {/* Existing Entries */}
      <div>
        <h3 className="text-sm font-medium text-white mb-3">
          Conocimiento Existente ({knowledgeEntries.length})
        </h3>

        {isLoading ? (
          <div className="text-center py-8 text-gray-400">
            <span className="animate-spin inline-block">⏳</span> Cargando...
          </div>
        ) : knowledgeEntries.length === 0 ? (
          <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl">
            <SchoolIcon sx={{ fontSize: 40, opacity: 0.5 }} />
            <p className="mt-2">No hay conocimiento agregado aún</p>
            <p className="text-xs mt-1">Agrega contenido arriba para nutrir al agente</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {knowledgeEntries.map((entry) => (
              <div
                key={entry.id}
                className="p-4 bg-white/5 rounded-xl border border-white/10 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <span className="inline-block px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded mb-2">
                      {documentTypes.find((t) => t.value === entry.document_type)?.label || entry.document_type}
                    </span>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-4">
                      {entry.content}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteEntry(entry.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Eliminar"
                  >
                    <DeleteIcon fontSize="small" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-400">
          <strong>💡 Tip:</strong> El contenido que agregues aquí será usado por el agente cuando
          la capacidad &quot;Base de Conocimiento (RAG)&quot; esté activada. El agente buscará información
          relevante automáticamente para responder preguntas.
        </p>
      </div>
    </div>
  );
}

function CapabilitiesTab({ formData, setFormData }: TabProps) {
  const capabilities = [
    {
      id: "rag_enabled",
      label: "Base de Conocimiento (RAG)",
      description: "El agente puede consultar documentos y conocimiento almacenado",
      enabled: formData.capabilities?.rag_enabled ?? true,
    },
    {
      id: "web_search",
      label: "Búsqueda Web",
      description: "Permite al agente buscar información en internet",
      enabled: formData.capabilities?.web_search ?? false,
    },
    {
      id: "code_execution",
      label: "Ejecución de Código",
      description: "El agente puede ejecutar código Python para análisis",
      enabled: formData.capabilities?.code_execution ?? false,
    },
    {
      id: "image_generation",
      label: "Generación de Imágenes",
      description: "Permite generar imágenes con DALL-E o similar",
      enabled: formData.capabilities?.image_generation ?? false,
    },
  ];

  const toggleCapability = (id: string) => {
    setFormData({
      ...formData,
      capabilities: {
        ...formData.capabilities,
        [id]: !formData.capabilities?.[id as keyof typeof formData.capabilities],
      },
    });
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-gray-400 mb-4">
        Configura las capacidades adicionales del agente. Algunas funciones pueden tener costos adicionales.
      </p>

      {capabilities.map((cap) => (
        <div
          key={cap.id}
          className="flex items-center justify-between p-4 bg-white/5 rounded-xl"
        >
          <div>
            <p className="text-sm font-medium text-white">{cap.label}</p>
            <p className="text-xs text-gray-500">{cap.description}</p>
          </div>
          <button
            onClick={() => toggleCapability(cap.id)}
            className={`
              relative w-12 h-6 rounded-full transition-colors
              ${cap.enabled ? "bg-purple-600" : "bg-gray-600"}
            `}
          >
            <span
              className={`
                absolute top-1 w-4 h-4 rounded-full bg-white transition-transform
                ${cap.enabled ? "left-7" : "left-1"}
              `}
            />
          </button>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Sub-Agents Tab Component
// ============================================================================

interface SubAgentsTabProps {
  agentId: string;
  organizationId: string;
  subAgents: SubAgent[];
  setSubAgents: React.Dispatch<React.SetStateAction<SubAgent[]>>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSubAgent: SubAgent | null;
  setSelectedSubAgent: React.Dispatch<React.SetStateAction<SubAgent | null>>;
}

function SubAgentsTab({
  agentId,
  organizationId,
  subAgents,
  setSubAgents,
  isLoading,
  setIsLoading,
  selectedSubAgent,
  setSelectedSubAgent,
}: SubAgentsTabProps) {
  const { user } = useAuth();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [subAgentToDelete, setSubAgentToDelete] = useState<SubAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load sub-agents on mount
  useEffect(() => {
    const loadSubAgents = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/agents/${agentId}/sub-agents`
        );
        if (response.ok) {
          const data = await response.json();
          setSubAgents(data.sub_agents || []);
        }
      } catch (err) {
        console.error("Failed to load sub-agents:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSubAgents();
  }, [agentId, setIsLoading, setSubAgents]);

  // Show delete confirmation dialog
  const handleDeleteClick = (subAgent: SubAgent) => {
    setSubAgentToDelete(subAgent);
    setShowDeleteDialog(true);
  };

  // Handle sub-agent deletion after confirmation
  const handleConfirmDelete = async () => {
    if (!subAgentToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/agents/${agentId}/sub-agents/${subAgentToDelete.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSubAgents((prev) => prev.filter((sa) => sa.id !== subAgentToDelete.id));
        setSaveMessage({ type: "success", text: "Sub-agente eliminado" });
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (err) {
      console.error("Failed to delete sub-agent:", err);
      setSaveMessage({ type: "error", text: "Error al eliminar" });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setSubAgentToDelete(null);
    }
  };

  // Cancel delete
  const handleCancelDelete = () => {
    setShowDeleteDialog(false);
    setSubAgentToDelete(null);
  };

  // If a sub-agent is selected, show its config panel
  if (selectedSubAgent) {
    return (
      <SubAgentConfigPanel
        subAgent={selectedSubAgent}
        agentId={agentId}
        organizationId={organizationId}
        onBack={() => setSelectedSubAgent(null)}
        onSave={(updated) => {
          setSubAgents((prev) =>
            prev.map((sa) => (sa.id === updated.id ? updated : sa))
          );
          setSelectedSubAgent(null);
        }}
      />
    );
  }

  // Show create form
  if (showCreateForm) {
    return (
      <SubAgentCreateForm
        agentId={agentId}
        organizationId={organizationId}
        userId={user?.id || ""}
        onBack={() => setShowCreateForm(false)}
        onCreate={(newSubAgent) => {
          setSubAgents((prev) => [...prev, newSubAgent]);
          setShowCreateForm(false);
          setSaveMessage({ type: "success", text: "Sub-agente creado correctamente" });
          setTimeout(() => setSaveMessage(null), 3000);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">Sub Agentes</h3>
          <p className="text-sm text-gray-400">
            Configura los sub-agentes especializados que trabajan bajo este orquestador
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <AddIcon fontSize="small" />
          Nuevo Sub Agente
        </button>
      </div>

      {/* Messages */}
      {saveMessage && (
        <div
          className={`p-3 rounded-xl text-sm ${
            saveMessage.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-400"
              : "bg-red-500/10 border border-red-500/20 text-red-400"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Sub-agents Grid */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400">
          <span className="animate-spin inline-block text-2xl">⏳</span>
          <p className="mt-2">Cargando sub-agentes...</p>
        </div>
      ) : subAgents.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-xl border border-white/10">
          <GroupWorkIcon sx={{ fontSize: 48, opacity: 0.5 }} className="text-gray-500" />
          <p className="mt-3 text-gray-400">No hay sub-agentes configurados</p>
          <p className="text-sm text-gray-500 mt-1">
            Crea sub-agentes especializados para dividir las tareas del orquestador
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium transition-colors"
          >
            Crear primer sub-agente
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {subAgents.map((subAgent) => (
            <div
              key={subAgent.id}
              className="p-4 bg-white/5 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-lg shrink-0">
                  {subAgent.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-white truncate">
                      {subAgent.name}
                    </h4>
                    {subAgent.is_active ? (
                      <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        Activo
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 text-xs bg-gray-500/20 text-gray-400 rounded">
                        Inactivo
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{subAgent.role}</p>
                  {subAgent.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {subAgent.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-400 rounded">
                      {subAgent.ai_model}
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-white/10 text-gray-400 rounded">
                      T: {subAgent.temperature}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                <button
                  onClick={() => setSelectedSubAgent(subAgent)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white text-xs font-medium transition-colors"
                >
                  <EditIcon fontSize="small" />
                  Configurar
                </button>
                <button
                  onClick={() => handleDeleteClick(subAgent)}
                  className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <DeleteIcon fontSize="small" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <p className="text-sm text-blue-400">
          <strong>💡 Patrón Orquestador:</strong> Este agente actúa como un director de orquesta.
          Los sub-agentes son los músicos especializados que ejecutan tareas específicas.
          El orquestador analizará el mensaje del usuario y decidirá automáticamente qué
          sub-agente(s) invocar según el contexto.
        </p>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Eliminar Sub-Agente"
        message={`¿Estás seguro de eliminar "${subAgentToDelete?.name}"? Esta acción eliminará también todo el conocimiento asociado y no se puede deshacer.`}
        confirmText="Sí, eliminar"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isLoading={isDeleting}
        variant="danger"
      />
    </div>
  );
}

// ============================================================================
// Sub-Agent Create Form
// ============================================================================

interface SubAgentCreateFormProps {
  agentId: string;
  organizationId: string;
  userId: string;
  onBack: () => void;
  onCreate: (subAgent: SubAgent) => void;
}

function SubAgentCreateForm({
  agentId,
  organizationId,
  userId,
  onBack,
  onCreate,
}: SubAgentCreateFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    role: "",
    description: "",
    icon: "🔧",
    ai_model: "gpt-4o-mini",
    temperature: 0.7,
    max_tokens: 2048,
    system_prompt: "",
    is_active: true,
    capabilities: {
      rag_enabled: true,
      web_search: false,
      code_execution: false,
      image_generation: false,
    },
  });

  // Auto-generate slug from name
  useEffect(() => {
    if (formData.name) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      setFormData((prev) => ({ ...prev, slug }));
    }
  }, [formData.name]);

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.role.trim()) {
      setError("Nombre y rol son requeridos");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/agents/${agentId}/sub-agents?created_by=${userId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const newSubAgent = await response.json();
        onCreate(newSubAgent);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || "Error al crear sub-agente");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        >
          <ArrowBackIcon fontSize="small" />
          <span className="text-sm">Volver</span>
        </button>
        <div className="w-px h-6 bg-white/10" />
        <h3 className="text-lg font-semibold text-white">Crear Sub Agente</h3>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Left Column - Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              placeholder="Ej: Especialista en Hooks"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Rol *
            </label>
            <input
              type="text"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              placeholder="Ej: Hook Writer"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="input-dark w-full rounded-xl px-4 py-3 text-sm resize-none"
              placeholder="Breve descripción de la especialidad"
            />
          </div>

          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Icono
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm text-center text-2xl"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Modelo IA
              </label>
              <select
                value={formData.ai_model}
                onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              >
                <option value="gpt-4o-mini">GPT-4o Mini</option>
                <option value="gpt-4o">GPT-4o</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-300">
                Temperatura
              </label>
              <span className="text-sm text-purple-400">{formData.temperature}</span>
            </div>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
              className="w-full accent-purple-500"
            />
          </div>
        </div>

        {/* Right Column - System Prompt */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              System Prompt
            </label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={12}
              className="input-dark w-full rounded-xl px-4 py-3 text-sm font-mono resize-none"
              placeholder="Define el comportamiento y especialidad del sub-agente..."
            />
          </div>

          {/* Capabilities */}
          <div className="p-4 bg-white/5 rounded-xl">
            <p className="text-sm font-medium text-white mb-3">Capacidades</p>
            <div className="space-y-2">
              {[
                { id: "rag_enabled", label: "Knowledge Base (RAG)" },
                { id: "web_search", label: "Búsqueda Web" },
              ].map((cap) => (
                <label key={cap.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.capabilities[cap.id as keyof typeof formData.capabilities]}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capabilities: {
                          ...formData.capabilities,
                          [cap.id]: e.target.checked,
                        },
                      })
                    }
                    className="rounded border-gray-600 bg-dark-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-300">{cap.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
        <button
          onClick={onBack}
          className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          {isSaving ? (
            <>
              <span className="animate-spin">⏳</span>
              Creando...
            </>
          ) : (
            <>
              <AddIcon fontSize="small" />
              Crear Sub Agente
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Agent Config Panel
// ============================================================================

interface SubAgentConfigPanelProps {
  subAgent: SubAgent;
  agentId: string;
  organizationId: string;
  onBack: () => void;
  onSave: (subAgent: SubAgent) => void;
}

function SubAgentConfigPanel({
  subAgent,
  agentId,
  organizationId,
  onBack,
  onSave,
}: SubAgentConfigPanelProps) {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<"config" | "knowledge">("config");

  const [formData, setFormData] = useState({
    name: subAgent.name,
    role: subAgent.role,
    description: subAgent.description || "",
    icon: subAgent.icon,
    ai_model: subAgent.ai_model,
    temperature: subAgent.temperature,
    max_tokens: subAgent.max_tokens,
    system_prompt: subAgent.system_prompt || "",
    is_active: subAgent.is_active,
    capabilities: { ...subAgent.capabilities },
  });

  // Knowledge state
  const [knowledgeEntries, setKnowledgeEntries] = useState<KnowledgeEntry[]>([]);
  const [isLoadingKnowledge, setIsLoadingKnowledge] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newDocType, setNewDocType] = useState("general");
  const [isSavingKnowledge, setIsSavingKnowledge] = useState(false);

  // Load knowledge for this sub-agent
  useEffect(() => {
    if (activeSection === "knowledge") {
      const loadKnowledge = async () => {
        setIsLoadingKnowledge(true);
        try {
          const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/knowledge/documents?organization_id=${organizationId}&sub_agent_id=${subAgent.id}`
          );
          if (response.ok) {
            const data = await response.json();
            setKnowledgeEntries(data.documents || []);
          }
        } catch (err) {
          console.error("Failed to load knowledge:", err);
        } finally {
          setIsLoadingKnowledge(false);
        }
      };
      loadKnowledge();
    }
  }, [activeSection, organizationId, subAgent.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/agents/${agentId}/sub-agents/${subAgent.id}?modified_by=${user.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        setSuccessMessage("Configuración guardada");
        setTimeout(() => {
          setSuccessMessage(null);
          onSave(updated);
        }, 1500);
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.detail || "Error al guardar");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddKnowledge = async () => {
    if (!newContent.trim()) return;

    setIsSavingKnowledge(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/knowledge/documents?organization_id=${organizationId}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sub_agent_id: subAgent.id,
            content: newContent.trim(),
            document_type: newDocType,
            metadata: { source: "admin_panel" },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setKnowledgeEntries((prev) => [...prev, data]);
        setNewContent("");
      }
    } catch (err) {
      console.error("Failed to add knowledge:", err);
    } finally {
      setIsSavingKnowledge(false);
    }
  };

  const handleDeleteKnowledge = async (entryId: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/knowledge/documents/${entryId}`,
        { method: "DELETE" }
      );
      if (response.ok) {
        setKnowledgeEntries((prev) => prev.filter((e) => e.id !== entryId));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const documentTypes = [
    { value: "general", label: "General" },
    { value: "product", label: "Productos" },
    { value: "faq", label: "FAQ" },
    { value: "policy", label: "Políticas" },
    { value: "brand", label: "Marca" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowBackIcon fontSize="small" />
            <span className="text-sm">Volver</span>
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-2xl">{subAgent.icon}</span>
            <div>
              <h3 className="text-lg font-semibold text-white">{subAgent.name}</h3>
              <p className="text-xs text-gray-500">{subAgent.role}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <SaveIcon fontSize="small" />
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400">
          {successMessage}
        </div>
      )}

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2">
        <button
          onClick={() => setActiveSection("config")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSection === "config"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Configuración
        </button>
        <button
          onClick={() => setActiveSection("knowledge")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            activeSection === "knowledge"
              ? "bg-purple-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-white/10"
          }`}
        >
          Knowledge Base
        </button>
      </div>

      {activeSection === "config" ? (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Rol</label>
              <input
                type="text"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Descripción</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="input-dark w-full rounded-xl px-4 py-3 text-sm resize-none"
              />
            </div>
            <div className="flex gap-4">
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-300 mb-2">Icono</label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="input-dark w-full rounded-xl px-4 py-3 text-sm text-center text-2xl"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">Modelo IA</label>
                <select
                  value={formData.ai_model}
                  onChange={(e) => setFormData({ ...formData, ai_model: e.target.value })}
                  className="input-dark w-full rounded-xl px-4 py-3 text-sm"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-300">Temperatura</label>
                <span className="text-sm text-purple-400">{formData.temperature}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                className="w-full accent-purple-500"
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
              <div>
                <p className="text-sm font-medium text-white">Sub-agente Activo</p>
                <p className="text-xs text-gray-500">Disponible para el orquestador</p>
              </div>
              <button
                onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  formData.is_active ? "bg-purple-600" : "bg-gray-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    formData.is_active ? "left-7" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Right Column - System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">System Prompt</label>
            <textarea
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              rows={16}
              className="input-dark w-full rounded-xl px-4 py-3 text-sm font-mono resize-none"
              placeholder="Define el comportamiento y especialidad..."
            />
          </div>
        </div>
      ) : (
        /* Knowledge Section */
        <div className="space-y-6">
          {/* Add Entry */}
          <div className="p-4 bg-white/5 rounded-xl border border-white/10">
            <h4 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <AddIcon fontSize="small" />
              Agregar Conocimiento
            </h4>
            <div className="space-y-3">
              <select
                value={newDocType}
                onChange={(e) => setNewDocType(e.target.value)}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm"
              >
                {documentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={4}
                className="input-dark w-full rounded-lg px-3 py-2 text-sm font-mono resize-none"
                placeholder="Contenido del conocimiento..."
              />
              <button
                onClick={handleAddKnowledge}
                disabled={isSavingKnowledge || !newContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <AddIcon fontSize="small" />
                {isSavingKnowledge ? "Guardando..." : "Agregar"}
              </button>
            </div>
          </div>

          {/* Existing Entries */}
          <div>
            <h4 className="text-sm font-medium text-white mb-3">
              Conocimiento ({knowledgeEntries.length})
            </h4>
            {isLoadingKnowledge ? (
              <div className="text-center py-8 text-gray-400">
                <span className="animate-spin inline-block">⏳</span> Cargando...
              </div>
            ) : knowledgeEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500 bg-white/5 rounded-xl">
                <SchoolIcon sx={{ fontSize: 40, opacity: 0.5 }} />
                <p className="mt-2">Sin conocimiento</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {knowledgeEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="p-3 bg-white/5 rounded-xl border border-white/10 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-block px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded mb-1">
                          {documentTypes.find((t) => t.value === entry.document_type)?.label || entry.document_type}
                        </span>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-3">
                          {entry.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteKnowledge(entry.id)}
                        className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <DeleteIcon fontSize="small" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
