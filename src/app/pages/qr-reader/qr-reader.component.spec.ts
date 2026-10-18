import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLucideIcons } from '@lucide/angular';
import { QrReaderComponent } from './qr-reader.component';
import { MetadataService } from '@/app/services/metadata.service';
import { ToastService } from '@/app/services/toast.service';
import { USED_ICONS } from '@/app/utils/constants';

describe('QrReaderComponent', () => {
  let fixture: ComponentFixture<QrReaderComponent>;
  let component: QrReaderComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QrReaderComponent],
      providers: [
        provideRouter([]),
        provideLucideIcons(...Object.values(USED_ICONS)),
        MetadataService,
        ToastService,
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(QrReaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    component.stopCamera();
  });

  it('should create the QR Reader component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with empty state and file scan mode', () => {
    expect(component.imageSrc()).toBeUndefined();
    expect(component.scanResult()).toBeUndefined();
    expect(component.noQrFound()).toBe(false);
    expect(component.isScanning()).toBe(false);
    expect(component.scanMode()).toBe('file');
  });

  it('should toggle scan mode between file and camera', () => {
    component.setScanMode('camera');
    expect(component.scanMode()).toBe('camera');

    component.setScanMode('file');
    expect(component.scanMode()).toBe('file');
    expect(component.isCameraActive()).toBe(false);
  });

  it('should clear state when clear() is called', () => {
    component.imageName.set('test.png');
    component.imageSrc.set('data:image/png;base64,xxxx');
    component.noQrFound.set(true);

    component.clear();

    expect(component.imageSrc()).toBeUndefined();
    expect(component.imageName()).toBe('');
    expect(component.scanResult()).toBeUndefined();
    expect(component.noQrFound()).toBe(false);
  });

  it('should reset state on onFileChange(undefined)', () => {
    component.imageSrc.set('data:image/png;base64,test');
    component.onFileChange(undefined);
    expect(component.imageSrc()).toBeUndefined();
  });
});
