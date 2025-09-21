// PDF Tools JavaScript with Real PDF Processing

class PDFTools {
    constructor() {
        this.selectedTool = null;
        this.uploadedFile = null;
        this.isProcessing = false;
        this.progress = 0;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        this.scale = 1.5;
        
        this.tools = {
            watermark: {
                title: '浮水印',
                description: '為PDF文件添加文字或圖片浮水印',
                icon: 'fas fa-tint',
                color: 'blue'
            },
            delete: {
                title: '頁面刪除',
                description: '刪除PDF中不需要的頁面',
                icon: 'fas fa-trash',
                color: 'red'
            },
            split: {
                title: '頁面切割',
                description: '將PDF文件分割成多個文件',
                icon: 'fas fa-cut',
                color: 'green'
            },
            merge: {
                title: '合併',
                description: '將多個PDF文件合併為一個',
                icon: 'fas fa-link',
                color: 'purple'
            },
            tojpg: {
                title: '轉換JPG',
                description: '將PDF頁面轉換為JPG圖片',
                icon: 'fas fa-image',
                color: 'yellow'
            }
        };
        
        // Set PDF.js worker
        if (typeof pdfjsLib !== 'undefined') {
            pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        }
        
        this.init();
    }
    
    init() {
        this.bindEvents();
    }
    
    bindEvents() {
        // Tool selection
        document.querySelectorAll('.tool-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const toolId = card.dataset.tool;
                this.selectTool(toolId);
            });
        });
        
        // File upload
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        
        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));
        
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));
        
        // PDF navigation
        document.getElementById('prev-page')?.addEventListener('click', this.prevPage.bind(this));
        document.getElementById('next-page')?.addEventListener('click', this.nextPage.bind(this));
        
        // Process button
        document.getElementById('process-btn').addEventListener('click', this.processFile.bind(this));
    }
    
    selectTool(toolId) {
        // Update UI
        document.querySelectorAll('.tool-card').forEach(card => {
            card.classList.remove('selected');
        });
        
        document.querySelector(`[data-tool="${toolId}"]`).classList.add('selected');
        
        // Show tool interface
        const toolInterface = document.getElementById('tool-interface');
        toolInterface.style.display = 'block';
        
        // Update tool header
        const tool = this.tools[toolId];
        document.getElementById('selected-tool-icon').className = `tool-icon ${tool.color}`;
        document.getElementById('selected-tool-icon').innerHTML = `<i class="${tool.icon}"></i>`;
        document.getElementById('selected-tool-title').textContent = tool.title;
        document.getElementById('selected-tool-description').textContent = tool.description;
        
        // Update tool options
        this.updateToolOptions(toolId);
        
        // Reset file
        this.resetFile();
        
        this.selectedTool = toolId;
        
        // Scroll to tool interface
        toolInterface.scrollIntoView({ behavior: 'smooth' });
    }
    
    updateToolOptions(toolId) {
        const optionsContainer = document.getElementById('tool-options');
        let optionsHTML = '';
        
        switch (toolId) {
            case 'watermark':
                optionsHTML = `
                    <div class="option-group">
                        <label for="watermark-text">浮水印文字</label>
                        <textarea id="watermark-text" placeholder="輸入浮水印文字..."></textarea>
                    </div>
                    <div class="option-group">
                        <label for="watermark-position">位置</label>
                        <select id="watermark-position">
                            <option value="center">居中</option>
                            <option value="top-left">左上角</option>
                            <option value="top-right">右上角</option>
                            <option value="bottom-left">左下角</option>
                            <option value="bottom-right">右下角</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <label for="watermark-opacity">透明度</label>
                        <input type="range" id="watermark-opacity" min="0" max="100" value="50">
                        <small>當前值: <span id="opacity-value">50</span>%</small>
                    </div>
                    <div class="option-group">
                        <label for="watermark-size">字體大小</label>
                        <input type="range" id="watermark-size" min="10" max="100" value="30">
                        <small>當前值: <span id="size-value">30</span>px</small>
                    </div>
                `;
                break;
                
            case 'delete':
                optionsHTML = `
                    <div class="option-group">
                        <label for="pages-to-delete">要刪除的頁面</label>
                        <input type="text" id="pages-to-delete" placeholder="例如: 1,3,5-8">
                        <small>輸入頁面號碼，用逗號分隔，支持範圍 (如: 1,3,5-8)</small>
                    </div>
                    <div class="option-group">
                        <label>頁面預覽</label>
                        <div id="page-selection" class="page-selection">
                            <p>上傳文件後將顯示頁面選擇器</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'split':
                optionsHTML = `
                    <div class="option-group">
                        <label for="split-type">分割方式</label>
                        <select id="split-type">
                            <option value="single">每頁單獨文件</option>
                            <option value="range">按頁面範圍</option>
                            <option value="even-odd">奇偶頁分割</option>
                            <option value="custom">自定義分割</option>
                        </select>
                    </div>
                    <div class="option-group" id="split-range-group" style="display: none;">
                        <label for="split-range">分割範圍</label>
                        <input type="text" id="split-range" placeholder="例如: 1-5, 6-10">
                        <small>指定分割的頁面範圍</small>
                    </div>
                `;
                break;
                
            case 'merge':
                optionsHTML = `
                    <div class="option-group">
                        <label>添加更多PDF文件</label>
                        <div class="additional-files" id="additional-files">
                            <div class="file-input-group">
                                <input type="file" class="additional-file-input" accept=".pdf">
                                <button type="button" class="add-file-btn">
                                    <i class="fas fa-plus"></i> 添加文件
                                </button>
                            </div>
                        </div>
                        <small>可以添加多個PDF文件進行合併</small>
                    </div>
                    <div class="option-group">
                        <label>文件順序</label>
                        <div id="file-order" class="file-order">
                            <p>上傳文件後將顯示文件順序</p>
                        </div>
                    </div>
                `;
                break;
                
            case 'tojpg':
                optionsHTML = `
                    <div class="option-group">
                        <label for="jpg-quality">圖片品質</label>
                        <input type="range" id="jpg-quality" min="1" max="100" value="90">
                        <small>當前值: <span id="quality-value">90</span>%</small>
                    </div>
                    <div class="option-group">
                        <label for="jpg-dpi">DPI</label>
                        <select id="jpg-dpi">
                            <option value="72">72 DPI (網頁)</option>
                            <option value="150">150 DPI (標準)</option>
                            <option value="300">300 DPI (高品質)</option>
                            <option value="600">600 DPI (超高品質)</option>
                        </select>
                    </div>
                    <div class="option-group">
                        <label for="jpg-pages">轉換頁面</label>
                        <select id="jpg-pages">
                            <option value="all">所有頁面</option>
                            <option value="current">當前頁面</option>
                            <option value="custom">自定義範圍</option>
                        </select>
                    </div>
                    <div class="option-group" id="jpg-range-group" style="display: none;">
                        <label for="jpg-range">頁面範圍</label>
                        <input type="text" id="jpg-range" placeholder="例如: 1-5, 8, 10">
                    </div>
                `;
                break;
        }
        
        optionsContainer.innerHTML = optionsHTML;
        
        // Bind dynamic events
        this.bindDynamicEvents(toolId);
    }
    
    bindDynamicEvents(toolId) {
        // Opacity slider
        const opacitySlider = document.getElementById('watermark-opacity');
        const opacityValue = document.getElementById('opacity-value');
        if (opacitySlider && opacityValue) {
            opacitySlider.addEventListener('input', (e) => {
                opacityValue.textContent = e.target.value;
            });
        }
        
        // Size slider
        const sizeSlider = document.getElementById('watermark-size');
        const sizeValue = document.getElementById('size-value');
        if (sizeSlider && sizeValue) {
            sizeSlider.addEventListener('input', (e) => {
                sizeValue.textContent = e.target.value;
            });
        }
        
        // Quality slider
        const qualitySlider = document.getElementById('jpg-quality');
        const qualityValue = document.getElementById('quality-value');
        if (qualitySlider && qualityValue) {
            qualitySlider.addEventListener('input', (e) => {
                qualityValue.textContent = e.target.value;
            });
        }
        
        // Split type change
        const splitType = document.getElementById('split-type');
        const splitRangeGroup = document.getElementById('split-range-group');
        if (splitType && splitRangeGroup) {
            splitType.addEventListener('change', (e) => {
                splitRangeGroup.style.display = e.target.value === 'range' ? 'block' : 'none';
            });
        }
        
        // JPG pages change
        const jpgPages = document.getElementById('jpg-pages');
        const jpgRangeGroup = document.getElementById('jpg-range-group');
        if (jpgPages && jpgRangeGroup) {
            jpgPages.addEventListener('change', (e) => {
                jpgRangeGroup.style.display = e.target.value === 'custom' ? 'block' : 'none';
            });
        }
        
        // Add file button for merge
        const addFileBtn = document.querySelector('.add-file-btn');
        if (addFileBtn) {
            addFileBtn.addEventListener('click', this.addAdditionalFile.bind(this));
        }
    }
    
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('dragover');
    }
    
    handleDragLeave(e) {
        e.currentTarget.classList.remove('dragover');
    }
    
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }
    
    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.handleFile(files[0]);
        }
    }
    
    async handleFile(file) {
        if (file.type !== 'application/pdf') {
            this.showNotification('請選擇PDF文件', 'error');
            return;
        }
        
        if (file.size > 50 * 1024 * 1024) { // 50MB
            this.showNotification('文件大小不能超過50MB', 'error');
            return;
        }
        
        this.uploadedFile = file;
        this.displayFileInfo(file);
        
        // Load PDF for preview
        await this.loadPDF(file);
        this.updateProcessButton();
    }
    
    displayFileInfo(file) {
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        
        fileName.textContent = file.name;
        fileSize.textContent = `文件大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`;
        
        fileInfo.style.display = 'block';
    }
    
    async loadPDF(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            
            if (typeof pdfjsLib !== 'undefined') {
                // Load with PDF.js for preview
                const loadingTask = pdfjsLib.getDocument(arrayBuffer);
                this.pdfDoc = await loadingTask.promise;
                this.totalPages = this.pdfDoc.numPages;
                this.currentPage = 1;
                
                // Show preview
                this.showPDFPreview();
                this.renderPage(this.currentPage);
            } else {
                // Fallback - just show file info
                this.totalPages = 1; // Placeholder
                this.showPDFPreview();
            }
            
        } catch (error) {
            console.error('Error loading PDF:', error);
            this.showNotification('PDF文件加載失敗', 'error');
        }
    }
    
    showPDFPreview() {
        const pdfPreview = document.getElementById('pdf-preview');
        pdfPreview.style.display = 'block';
        
        // Update page info
        this.updatePageInfo();
    }
    
    async renderPage(pageNum) {
        if (!this.pdfDoc) return;
        
        try {
            const page = await this.pdfDoc.getPage(pageNum);
            const viewport = page.getViewport({ scale: this.scale });
            
            const canvas = document.getElementById('pdf-canvas');
            const context = canvas.getContext('2d');
            
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            
            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };
            
            await page.render(renderContext).promise;
            
        } catch (error) {
            console.error('Error rendering page:', error);
        }
    }
    
    prevPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderPage(this.currentPage);
            this.updatePageInfo();
        }
    }
    
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.renderPage(this.currentPage);
            this.updatePageInfo();
        }
    }
    
    updatePageInfo() {
        const pageInfo = document.getElementById('page-info');
        const prevBtn = document.getElementById('prev-page');
        const nextBtn = document.getElementById('next-page');
        
        pageInfo.textContent = `第 ${this.currentPage} 頁，共 ${this.totalPages} 頁`;
        
        prevBtn.disabled = this.currentPage <= 1;
        nextBtn.disabled = this.currentPage >= this.totalPages;
    }
    
    updateProcessButton() {
        const processBtn = document.getElementById('process-btn');
        processBtn.disabled = !this.uploadedFile || !this.selectedTool;
    }
    
    resetFile() {
        this.uploadedFile = null;
        this.pdfDoc = null;
        this.currentPage = 1;
        this.totalPages = 0;
        
        document.getElementById('file-info').style.display = 'none';
        document.getElementById('pdf-preview').style.display = 'none';
        document.getElementById('file-input').value = '';
        this.updateProcessButton();
        this.hideProgress();
    }
    
    async processFile() {
        if (!this.uploadedFile || !this.selectedTool) return;
        
        this.isProcessing = true;
        this.showProgress();
        
        try {
            let result;
            
            // Update progress for different stages
            this.updateProgress(10);
            
            switch (this.selectedTool) {
                case 'watermark':
                    this.updateProgress(30);
                    result = await this.addWatermark();
                    break;
                case 'delete':
                    this.updateProgress(30);
                    result = await this.deletePages();
                    break;
                case 'split':
                    this.updateProgress(30);
                    result = await this.splitPDF();
                    break;
                case 'merge':
                    this.updateProgress(30);
                    result = await this.mergePDFs();
                    break;
                case 'tojpg':
                    this.updateProgress(20);
                    result = await this.convertToJPG();
                    this.updateProgress(80);
                    break;
                default:
                    throw new Error('Unknown tool');
            }
            
            this.updateProgress(90);
            
            if (result) {
                this.downloadResult(result, this.getFileName());
                this.showNotification(`${this.tools[this.selectedTool].title}處理完成！`, 'success');
            }
            
            this.updateProgress(100);
            
        } catch (error) {
            console.error('Processing error:', error);
            this.showNotification(`處理失敗: ${error.message}`, 'error');
        } finally {
            this.isProcessing = false;
            setTimeout(() => this.hideProgress(), 1000);
        }
    }
    
    async addWatermark() {
        if (!this.uploadedFile) throw new Error('No file uploaded');
        
        const watermarkText = document.getElementById('watermark-text').value;
        const position = document.getElementById('watermark-position').value;
        const opacity = parseInt(document.getElementById('watermark-opacity').value) / 100;
        const fontSize = parseInt(document.getElementById('watermark-size').value);
        
        if (!watermarkText) throw new Error('請輸入浮水印文字');
        
        const arrayBuffer = await this.uploadedFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const pages = pdfDoc.getPages();
        
        for (const page of pages) {
            const { width, height } = page.getSize();
            
            let x = 0, y = 0;
            
            switch (position) {
                case 'top-left':
                    x = 50;
                    y = height - 50;
                    break;
                case 'top-right':
                    x = width - 200;
                    y = height - 50;
                    break;
                case 'bottom-left':
                    x = 50;
                    y = 50;
                    break;
                case 'bottom-right':
                    x = width - 200;
                    y = 50;
                    break;
                default: // center
                    x = (width - fontSize * watermarkText.length * 0.6) / 2;
                    y = height / 2;
            }
            
            page.drawText(watermarkText, {
                x: x,
                y: y,
                size: fontSize,
                color: PDFLib.rgb(0.5, 0.5, 0.5),
                opacity: opacity,
                rotate: PDFLib.degrees(-45)
            });
        }
        
        return await pdfDoc.save();
    }
    
    async deletePages() {
        if (!this.uploadedFile) throw new Error('No file uploaded');
        
        const pagesToDelete = document.getElementById('pages-to-delete').value;
        if (!pagesToDelete) throw new Error('請輸入要刪除的頁面');
        
        const arrayBuffer = await this.uploadedFile.arrayBuffer();
        const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const totalPages = pdfDoc.getPageCount();
        const pageNumbers = this.parsePageNumbers(pagesToDelete, totalPages);
        
        // Remove pages in reverse order to maintain correct indices
        const sortedPages = [...pageNumbers].sort((a, b) => b - a);
        for (const pageNum of sortedPages) {
            pdfDoc.removePage(pageNum - 1);
        }
        
        return await pdfDoc.save();
    }
    
    async splitPDF() {
        if (!this.uploadedFile) throw new Error('No file uploaded');
        
        const splitType = document.getElementById('split-type').value;
        const arrayBuffer = await this.uploadedFile.arrayBuffer();
        const originalPdf = await PDFLib.PDFDocument.load(arrayBuffer);
        
        const results = [];
        
        switch (splitType) {
            case 'single':
                // Split each page into separate PDF
                for (let i = 0; i < originalPdf.getPageCount(); i++) {
                    const newPdf = await PDFLib.PDFDocument.create();
                    const [page] = await newPdf.copyPages(originalPdf, [i]);
                    newPdf.addPage(page);
                    results.push(await newPdf.save());
                }
                break;
                
            case 'even-odd':
                // Split into even and odd pages
                const evenPdf = await PDFLib.PDFDocument.create();
                const oddPdf = await PDFLib.PDFDocument.create();
                
                for (let i = 0; i < originalPdf.getPageCount(); i++) {
                    const [page] = await originalPdf.copyPages(originalPdf, [i]);
                    if (i % 2 === 0) {
                        oddPdf.addPage(page);
                    } else {
                        evenPdf.addPage(page);
                    }
                }
                
                if (oddPdf.getPageCount() > 0) results.push(await oddPdf.save());
                if (evenPdf.getPageCount() > 0) results.push(await evenPdf.save());
                break;
                
            case 'range':
                // Custom range splitting
                const splitRange = document.getElementById('split-range').value;
                if (!splitRange) throw new Error('請輸入分割範圍');
                
                const ranges = splitRange.split(',').map(r => r.trim());
                for (const range of ranges) {
                    const [start, end] = range.split('-').map(n => parseInt(n.trim()));
                    if (start && end) {
                        const newPdf = await PDFLib.PDFDocument.create();
                        for (let i = start - 1; i < end && i < originalPdf.getPageCount(); i++) {
                            const [page] = await newPdf.copyPages(originalPdf, [i]);
                            newPdf.addPage(page);
                        }
                        if (newPdf.getPageCount() > 0) {
                            results.push(await newPdf.save());
                        }
                    }
                }
                break;
        }
        
        return results.length > 0 ? results[0] : null; // Return first result for simplicity
    }
    
    async mergePDFs() {
        const files = [this.uploadedFile];
        
        // Get additional files
        const additionalInputs = document.querySelectorAll('.additional-file-input');
        for (const input of additionalInputs) {
            if (input.files[0]) {
                files.push(input.files[0]);
            }
        }
        
        if (files.length === 0) throw new Error('沒有文件可合併');
        
        const mergedPdf = await PDFLib.PDFDocument.create();
        
        for (const file of files) {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
            const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            pages.forEach(page => mergedPdf.addPage(page));
        }
        
        return await mergedPdf.save();
    }
    
    async convertToJPG() {
        if (!this.uploadedFile) throw new Error('No file uploaded');
        
        const jpgPages = document.getElementById('jpg-pages').value;
        const quality = parseInt(document.getElementById('jpg-quality').value) / 100;
        const dpi = parseInt(document.getElementById('jpg-dpi').value);
        
        let pagesToConvert = [];
        
        switch (jpgPages) {
            case 'all':
                pagesToConvert = Array.from({ length: this.totalPages }, (_, i) => i + 1);
                break;
            case 'current':
                pagesToConvert = [this.currentPage];
                break;
            case 'custom':
                const customRange = document.getElementById('jpg-range').value;
                if (!customRange) throw new Error('請輸入頁面範圍');
                pagesToConvert = this.parsePageNumbers(customRange, this.totalPages);
                break;
        }
        
        if (pagesToConvert.length === 0) {
            throw new Error('沒有可轉換的頁面');
        }
        
        // Check if PDF.js is loaded
        if (typeof pdfjsLib === 'undefined') {
            throw new Error('PDF.js 庫未載入，請刷新頁面重試');
        }
        
        // Update progress - Loading PDF
        this.updateProgress(30);
        
        // Load the PDF file with PDF.js for rendering
        const arrayBuffer = await this.uploadedFile.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument(arrayBuffer);
        const pdfDoc = await loadingTask.promise;
        
        const results = [];
        
        // Process each page
        for (let i = 0; i < pagesToConvert.length; i++) {
            const pageNum = pagesToConvert[i];
            
            if (pageNum > 0 && pageNum <= pdfDoc.numPages) {
                try {
                    // Update progress for each page
                    const pageProgress = 40 + (i / pagesToConvert.length * 40);
                    this.updateProgress(Math.round(pageProgress));
                    
                    const page = await pdfDoc.getPage(pageNum);
                    
                    // Calculate scale based on DPI
                    const scale = dpi / 72; // 72 is the base DPI for PDF
                    
                    const viewport = page.getViewport({ scale: scale });
                    
                    // Create canvas
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;
                    
                    // Set canvas background to white
                    context.fillStyle = 'white';
                    context.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Render PDF page to canvas
                    await page.render({
                        canvasContext: context,
                        viewport: viewport
                    }).promise;
                    
                    // Convert canvas to blob with Promise wrapper
                    const blob = await new Promise((resolve, reject) => {
                        canvas.toBlob((blob) => {
                            if (blob) {
                                resolve(blob);
                            } else {
                                reject(new Error('Canvas轉換失敗'));
                            }
                        }, 'image/jpeg', quality);
                    });
                    
                    results.push({
                        blob: blob,
                        pageNumber: pageNum,
                        width: canvas.width,
                        height: canvas.height
                    });
                    
                } catch (error) {
                    console.error(`Error converting page ${pageNum}:`, error);
                    throw new Error(`第 ${pageNum} 頁轉換失敗: ${error.message}`);
                }
            }
        }
        
        if (results.length === 0) {
            throw new Error('沒有成功轉換的頁面');
        }
        
        // If multiple pages, create a zip file or return the first one
        // For simplicity, we'll return the first result
        return results[0].blob;
    }
    
    parsePageNumbers(pageString, totalPages) {
        const numbers = [];
        const parts = pageString.split(',');
        
        for (const part of parts) {
            const trimmed = part.trim();
            if (trimmed.includes('-')) {
                const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
                if (start && end) {
                    for (let i = start; i <= end; i++) {
                        if (i >= 1 && i <= totalPages) {
                            numbers.push(i);
                        }
                    }
                }
            } else {
                const num = parseInt(trimmed);
                if (num >= 1 && num <= totalPages) {
                    numbers.push(num);
                }
            }
        }
        
        return [...new Set(numbers)].sort((a, b) => a - b);
    }
    
    getFileName() {
        const originalName = this.uploadedFile.name.replace('.pdf', '');
        const toolName = this.tools[this.selectedTool].title;
        
        switch (this.selectedTool) {
            case 'watermark':
                return `${originalName}_浮水印.pdf`;
            case 'delete':
                return `${originalName}_刪除頁面.pdf`;
            case 'split':
                return `${originalName}_分割.pdf`;
            case 'merge':
                return `${originalName}_合併.pdf`;
            case 'tojpg':
                return `${originalName}.jpg`;
            default:
                return `${originalName}_處理後.pdf`;
        }
    }
    
    downloadResult(data, filename) {
        const blob = new Blob([data], { type: this.selectedTool === 'tojpg' ? 'image/jpeg' : 'application/pdf' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }
    
    showProgress() {
        const progressContainer = document.getElementById('progress-container');
        progressContainer.style.display = 'block';
        this.updateProgress(0);
    }
    
    hideProgress() {
        const progressContainer = document.getElementById('progress-container');
        progressContainer.style.display = 'none';
    }
    
    updateProgress(value) {
        const progressFill = document.getElementById('progress-fill');
        const progressText = document.getElementById('progress-text');
        
        progressFill.style.width = `${value}%`;
        progressText.textContent = `處理進度: ${value}%`;
    }
    
    addAdditionalFile() {
        const additionalFiles = document.getElementById('additional-files');
        const fileInputGroup = document.createElement('div');
        fileInputGroup.className = 'file-input-group';
        fileInputGroup.innerHTML = `
            <input type="file" class="additional-file-input" accept=".pdf">
            <button type="button" class="remove-file-btn">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        additionalFiles.appendChild(fileInputGroup);
        
        // Bind remove event
        fileInputGroup.querySelector('.remove-file-btn').addEventListener('click', () => {
            fileInputGroup.remove();
        });
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(notification);
        
        // Show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new PDFTools();
});

// Add notification styles dynamically
const notificationStyles = `
.notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 16px;
    z-index: 1000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.notification.show {
    transform: translateX(0);
}

.notification-content {
    display: flex;
    align-items: center;
    gap: 12px;
}

.notification-success {
    border-left: 4px solid #10b981;
}

.notification-success i {
    color: #10b981;
}

.notification-error {
    border-left: 4px solid #ef4444;
}

.notification-error i {
    color: #ef4444;
}

.notification-info {
    border-left: 4px solid #3b82f6;
}

.notification-info i {
    color: #3b82f6;
}

.file-input-group {
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
}

.file-input-group input {
    flex: 1;
}

.add-file-btn,
.remove-file-btn {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    background: white;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.add-file-btn:hover,
.remove-file-btn:hover {
    background: #f3f4f6;
}

.remove-file-btn {
    background: #fee2e2;
    border-color: #fecaca;
    color: #991b1b;
}

.remove-file-btn:hover {
    background: #fecaca;
}

.page-selection {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
    min-height: 100px;
}

.file-order {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.375rem;
    padding: 1rem;
    min-height: 100px;
}
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);