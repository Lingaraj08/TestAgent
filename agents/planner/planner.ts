import { v4 as uuidv4 } from 'uuid';
import type { AgentPlan, AgentStep } from '../types';

export class AgentPlanner {
  /**
   * Analyze the user prompt, attachments, and requested mode to create an actionable plan
   */
  static plan(
    userPrompt: string,
    attachments: { filename: string; id?: string }[] = [],
    mode: 'chat' | 'search' | 'agent' | 'deep_research' = 'agent'
  ): AgentPlan {
    const promptLower = userPrompt.toLowerCase();
    const steps: AgentStep[] = [];

    // 1. Check if files are attached or referenced
    const hasAttachments = attachments.length > 0;
    const _mentionsFile =
      hasAttachments ||
      promptLower.includes('file') ||
      promptLower.includes('csv') ||
      promptLower.includes('excel') ||
      promptLower.includes('.xlsx') ||
      promptLower.includes('pdf') ||
      promptLower.includes('document');

    // 2. Identify primary goal
    const isExcelGoal =
      promptLower.includes('excel') ||
      promptLower.includes('.xlsx') ||
      promptLower.includes('spreadsheet') ||
      promptLower.includes('sheet');

    const isWordGoal =
      promptLower.includes('word') ||
      promptLower.includes('.docx') ||
      promptLower.includes('document') && promptLower.includes('create');

    const isPdfGoal =
      promptLower.includes('pdf') ||
      promptLower.includes('invoice') && promptLower.includes('create');

    const isPptxGoal =
      promptLower.includes('powerpoint') ||
      promptLower.includes('presentation') ||
      promptLower.includes('.pptx') ||
      promptLower.includes('slides');

    const isCodeGoal =
      promptLower.includes('run python') ||
      promptLower.includes('execute code') ||
      promptLower.includes('run this code') ||
      promptLower.includes('calculate with python');

    const isSearchGoal =
      mode === 'search' ||
      mode === 'deep_research' ||
      promptLower.includes('search') ||
      promptLower.includes('latest') ||
      promptLower.includes('news') ||
      promptLower.includes('who is') ||
      promptLower.includes('what is the current');
    const isImageGoal = /\b(generate|create|make|draw)\b.*\b(image|picture|illustration|photo|logo)\b/.test(promptLower);
    const isImageEditGoal = /\b(edit|remove|change|restyle|improve|background)\b.*\b(image|photo|picture)\b/.test(promptLower);
    const isBrowserGoal = /\b(job|application|apply|website|form|page)\b/.test(promptLower);

    // Step generation based on workflow patterns
    if (isExcelGoal) {
      if (hasAttachments) {
        steps.push({
          id: uuidv4(),
          title: `Inspect attached dataset (${attachments[0].filename})`,
          toolName: 'read_file',
          input: { fileIdentifier: attachments[0].id || attachments[0].filename },
          status: 'pending',
        });
      }
      steps.push({
        id: uuidv4(),
        title: 'Generate structured Excel spreadsheet (.xlsx)',
        toolName: 'generate_excel',
        input: {
          filename: 'report.xlsx',
          pythonCode: '# Generate Excel dataset\nimport pandas as pd\ndf = pd.DataFrame({"Item": ["A", "B", "C"], "Value": [100, 200, 300]})\ndf.to_excel("report.xlsx", index=False)',
        },
        status: 'pending',
      });
    } else if (isWordGoal) {
      steps.push({
        id: uuidv4(),
        title: 'Generate formatted Word document (.docx)',
        toolName: 'generate_word',
        input: {
          filename: 'document.docx',
          pythonCode: 'import docx\ndoc = docx.Document()\ndoc.add_heading("Document Title", 0)\ndoc.add_paragraph("Generated report content.")\ndoc.save("document.docx")',
        },
        status: 'pending',
      });
    } else if (isPdfGoal) {
      steps.push({
        id: uuidv4(),
        title: 'Generate printable PDF document (.pdf)',
        toolName: 'generate_pdf',
        input: {
          filename: 'document.pdf',
          pythonCode: 'from reportlab.lib.pagesizes import letter\nfrom reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer\nfrom reportlab.lib.styles import getSampleStyleSheet\ndoc = SimpleDocTemplate("document.pdf", pagesize=letter)\nstyles = getSampleStyleSheet()\nstory = [Paragraph("Generated PDF Document", styles["Heading1"]), Spacer(1, 12), Paragraph("Official report output.", styles["Normal"])]\ndoc.build(story)',
        },
        status: 'pending',
      });
    } else if (isPptxGoal) {
      steps.push({
        id: uuidv4(),
        title: 'Generate presentation deck (.pptx)',
        toolName: 'generate_powerpoint',
        input: {
          filename: 'presentation.pptx',
          pythonCode: 'import pptx\nprs = pptx.Presentation()\nslide = prs.slides.add_slide(prs.slide_layouts[0])\nslide.shapes.title.text = "Nexus AI Workspace"\nslide.placeholders[1].text = "Generated Presentation"\nprs.save("presentation.pptx")',
        },
        status: 'pending',
      });
    } else if (isCodeGoal) {
      steps.push({
        id: uuidv4(),
        title: 'Execute code in secure sandbox',
        toolName: 'execute_code',
        input: { code: 'print("Running user computational task...")' },
        status: 'pending',
      });
    } else if (mode === 'deep_research') {
      steps.push({ id: uuidv4(), title: `Research "${userPrompt.slice(0, 80)}" across accessible sources`, toolName: 'deep_research', input: { topic: userPrompt, maxSources: 5 }, status: 'pending' });
    } else if (isImageEditGoal && hasAttachments) {
      steps.push({ id: uuidv4(), title: 'Edit uploaded image', toolName: 'edit_image', input: { prompt: userPrompt, sourceFileId: attachments[0].id }, status: 'pending' });
    } else if (isImageGoal) {
      steps.push({ id: uuidv4(), title: 'Generate image artifact', toolName: 'generate_image', input: { prompt: userPrompt }, status: 'pending' });
    } else if (isBrowserGoal && /https?:\/\//.test(userPrompt)) {
      const url = userPrompt.match(/https?:\/\/[^\s)]+/)?.[0];
      if (url) steps.push({ id: uuidv4(), title: 'Inspect public page and discover forms', toolName: 'browser_inspect', input: { url }, status: 'pending' });
    } else if (isSearchGoal || isBrowserGoal) {
      steps.push({
        id: uuidv4(),
        title: `Search the web for "${userPrompt.slice(0, 50)}"`,
        toolName: 'web_search',
        input: { query: userPrompt.replace(/search for|find out|search/gi, '').trim() || userPrompt },
        status: 'pending',
      });
    } else if (hasAttachments) {
      steps.push({
        id: uuidv4(),
        title: `Read uploaded file "${attachments[0].filename}"`,
        toolName: 'read_file',
        input: { fileIdentifier: attachments[0].id || attachments[0].filename },
        status: 'pending',
      });
    }

    return {
      goal: userPrompt,
      explanation: steps.length
        ? `Planned ${steps.length} step(s) to fulfill the request.`
        : 'Direct conversational response without tool execution required.',
      steps,
    };
  }
}
