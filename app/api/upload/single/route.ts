import { CreditManager } from '@/services/CreditManager';
import { NextRequest, NextResponse } from 'next/server';
import { CONTRACT_ADDRESSES, Synapse, TIME_CONSTANTS, TOKENS } from "@filoz/synapse-sdk";
import { useAccount } from "wagmi";
import { preflightCheck } from "@/utils/preflightCheck";
import { getDataset } from "@/utils/getDataset";
import { privateKeyToAddress } from 'viem/accounts';
import { calculateStorageMetrics, DATA_SET_CREATION_FEE, MAX_UINT256 } from '@/utils';
import { config } from '@/config';
import { formatUnits } from 'ethers';
import JSZip from 'jszip';
import { prisma } from '@/lib/database';


const privateKey = "0x"+ process.env.PRIVATE_KEY as `0x${string}`

// Admin endpoint to manage backend wallet
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const creditManager = new CreditManager();
        console.log('Processing music upload with bundling...');

        // Extract form data
        const audioFile = formData.get('audioFile') as File | null;
        const coverImage = formData.get('coverImage') as File | null;
        const metadataString = formData.get('metadata') as string;
        const creatorId = formData.get('creatorId') as string;

        if (!audioFile) {
            return NextResponse.json(
                { error: 'Audio file is required' },
                { status: 400 }
            );
        }

        // Parse metadata
        let metadata;
        try {
            metadata = JSON.parse(metadataString);
        } catch (error) {
            return NextResponse.json(
                { error: 'Invalid metadata format' },
                { status: 400 }
            );
        }

        // Create ZIP bundle
        const zip = new JSZip();

        // Add audio file to ZIP
        const audioBuffer = await audioFile.arrayBuffer();
        const audioFileName = `audio.${audioFile.name.split('.').pop()}`;
        zip.file(audioFileName, audioBuffer);

        // Add cover image to ZIP if provided
        if (coverImage) {
            const coverBuffer = await coverImage.arrayBuffer();
            const coverFileName = `cover.${coverImage.name.split('.').pop()}`;
            zip.file(coverFileName, coverBuffer);
        }

        // Add metadata as JSON file
        const enhancedMetadata = {
            ...metadata,
            audioFileName,
            coverFileName: coverImage ? `cover.${coverImage.name.split('.').pop()}` : null,
            creatorId,
            bundledAt: new Date().toISOString(),
            version: '1.0'
        };
        zip.file('metadata.json', JSON.stringify(enhancedMetadata, null, 2));

        // Generate ZIP buffer
        const zipBuffer = await zip.generateAsync({ type: 'uint8array' });

        console.log(`Created ZIP bundle: ${zipBuffer.length} bytes`);

        // Use ZIP buffer as the file to upload
        const bundleFileName = `music_bundle_${Date.now()}_${metadata.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'untitled'}.zip`;
        
        const address = privateKeyToAddress(privateKey)

        
        // 3) Create Synapse instance
        const synapse = await Synapse.create({
            privateKey: privateKey,
            rpcURL: "https://api.calibration.node.glif.io/rpc/v1",
            disableNonceManager: false,
            withCDN: true,
        }).catch((err)=>{
            console.log(err)
        });
        console.log(synapse)
        const { providerId, dataset } = await getDataset(synapse!, address);
        // 5) Check if we have a dataset
        const datasetExists = !!providerId;
        console.log("PAssed Preflight")
        await paymentCheck(synapse!, address);
        // Include dataset creation fee if no dataset exists
        const includeDatasetCreationFee = !datasetExists;

        // Create a mock file object for preflight check using the ZIP bundle
        const bundleFile = new File([zipBuffer], bundleFileName, {
            type: 'application/zip'
        });

        await preflightCheck(
            bundleFile,
            synapse!,
            includeDatasetCreationFee,
            (status) => { console.log('Status:', status); },
            (progress) => { console.log('Progress:', progress); }
        );

          console.log("PAssed Preflight")
        if (providerId) {
            console.log(providerId)
            const provider = await synapse!.getProviderInfo(providerId);
            if (!provider || !provider.active) {
                throw new Error(`Storage provider ${providerId} is not available or inactive`);
            }
        }
        console.log(dataset)

        

        const storageService = await synapse?.createStorage({
            providerId: dataset?.providerId,
            forceCreateDataSet: false,
            uploadBatchSize: 2,
            withCDN: true
        })
        console.log(storageService)
        // Upload the ZIP bundle to Filecoin
        const { pieceCid } = await storageService!.upload(zipBuffer, {
            onUploadComplete: (piece) => {
              console.log(
                `📦 ZIP bundle uploaded successfully! Bundle size: ${piece} bytes`
              );
              console.log(`🎵 Contains: ${audioFileName}${coverImage ? `, cover image` : ''}, metadata.json`);
            },
            onPieceAdded: (transactionResponse) => {
              console.log(
                `🔄 Waiting for transaction to be confirmed on chain${
                  transactionResponse ? `(txHash: ${transactionResponse.hash})` : ""
                }`
              );
              if (transactionResponse) {
                console.log("Transaction response:", transactionResponse);
                
              }
            },
            onPieceConfirmed: (pieceIds) => {
              console.log("🌳 Data pieces added to dataset successfully");
              
            },
          });
        // Save upload information to database
        try {
            // Create or find user (in a real app, this would come from authentication)
            let user = await prisma.user.findUnique({
                where: { username: 'demo-user' } // This should be from auth context
            });

            if (!user) {
                user = await prisma.user.create({
                    data: {
                        username: 'demo-user',
                        displayName: metadata.artist || 'Demo User',
                        walletAddress: address
                    }
                });
            }

            // Create or find creator
            let creator = await prisma.creator.findUnique({
                where: { userId: user.id }
            });

            if (!creator) {
                creator = await prisma.creator.create({
                    data: {
                        userId: user.id,
                        stageName: metadata.artist,
                        genre: [metadata.genre],
                        description: metadata.description || `Music by ${metadata.artist}`,
                        walletAddress: address
                    }
                });
            }

            // Save uploaded file record
            const uploadedFile = await prisma.uploadedFile.create({
                data: {
                    fileName: bundleFileName,
                    originalName: audioFile.name,
                    fileSize: audioFile.size,
                    mimeType: 'application/zip', // ZIP bundle
                    fileHash: pieceCid.toString(),
                    pieceCid: pieceCid.toV1.toString(),
                    storageProvider: dataset?.providerId.toString() || "0",
                    uploadStatus: 'UPLOADED',
                    duration: metadata.duration || null,
                    genre: metadata.genre,
                    tags: metadata.tags || [],
                    isPublic: !metadata.isPremium,
                    isPremium: metadata.isPremium || false,
                    userId: user.id,
                    creatorId: creator.id,
                    creditsCost: 0 // This should be calculated based on file size and current rates
                }
            });

            console.log('Database record created:', uploadedFile.id);

            // Return comprehensive upload result
            return NextResponse.json({
                success: true,
                upload: {
                    id: uploadedFile.id,
                    pieceCid: pieceCid,
                    bundleSize: audioFile.size,
                    bundleFileName,
                    address: address,
                    metadata: enhancedMetadata,
                    database: {
                        userId: user.id,
                        creatorId: creator.id,
                        uploadedFileId: uploadedFile.id
                    },
                    filecoinStorage: {
                        network: synapse!.getNetwork(),
                        storageProvider: dataset?.providerId || 'default',
                        uploadedAt: new Date().toISOString()
                    }
                }
            });
        } catch (dbError: any) {
            console.error('Database error:', dbError);
            // Still return success for Filecoin upload, but note DB issue
            return NextResponse.json({
                success: true,
                warning: 'Upload successful but database sync failed',
                upload: {
                    pieceCid: pieceCid,
                    bundleSize: audioFile.size,
                    bundleFileName,
                    address: address,
                    metadata: enhancedMetadata,
                    filecoinStorage: {
                        network: synapse!.getNetwork(),
                        storageProvider: dataset?.providerId || 'default',
                        uploadedAt: new Date().toISOString()
                    },
                    databaseError: dbError.message
                }
            });
        }

    } catch (error: any) {
        console.error('Upload failed:', error);
        return NextResponse.json(
            { error: 'Upload failed', details: error.message },
            { status: 500 }
        );
    } finally {
        await prisma.$disconnect();
    }
}

export async function GET() {
    
        return NextResponse.json(
            { status:""},
            { status: 500 }
        );

}


const paymentCheck = async (synapse:Synapse, address: string,  )=> {
    const network = synapse.getNetwork();
    const paymentsAddress = CONTRACT_ADDRESSES.WARM_STORAGE[network];
      
      if (!paymentsAddress) {
        throw new Error(`No WARM_STORAGE contract address configured for network: ${network}`);
      }
      const { dataset } = await getDataset(synapse, address);
      const hasDataset = !!dataset;
      const fee = hasDataset ? 0n : DATA_SET_CREATION_FEE;
      const data = await calculateStorageMetrics(synapse)
      const depositNeededFormatted = Number(
        formatUnits(data?.depositNeeded ?? 0n, 18)
      ).toFixed(3);

      const amount = depositNeededFormatted + fee;
      const allowance = await synapse.payments.allowance(
        paymentsAddress,
        TOKENS.USDFC,
      );

      
      
      if(!data.isSufficient && !data.isRateSufficient){
        const balance = await synapse.payments.walletBalance(TOKENS.USDFC);

      if (balance < BigInt(amount)) {
        throw new Error("Insufficient USDFC balance");
      }
        if (allowance < MAX_UINT256 / 2n) {
        
            const transaction = await synapse.payments.approveService(
                synapse.getWarmStorageAddress(),
                data.totalLockupNeeded,
                data.rateNeeded + fee,
                TIME_CONSTANTS.EPOCHS_PER_DAY * BigInt(config.persistencePeriod)
            );
            await transaction.wait();
           
          }
          if (BigInt(amount) > 0n) {
            console.log("💰 Depositing USDFC to cover storage costs...");
            const transaction = await synapse.payments.deposit(BigInt(amount), TOKENS.USDFC);
            await transaction.wait();
            console.log("💰 Successfully deposited USDFC to cover storage costs");
          }
          console.log(
            "💰 Approving Filecoin Warm Storage service USDFC spending rates..."
          );
          const transaction = await synapse.payments.approveService(
            synapse.getWarmStorageAddress(),
            data.totalLockupNeeded,
            data.rateNeeded + fee,
            TIME_CONSTANTS.EPOCHS_PER_DAY * BigInt(config.persistencePeriod)
          );
          await transaction.wait();
      }
}