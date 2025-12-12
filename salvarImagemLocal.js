import { v4 as uuidv4 } from 'uuid';
import { Directory, File, Paths } from 'expo-file-system';

export const salvarImagemLocal = async (uri) => {
  try {
    const imageId = uuidv4();
    const filename = `${imageId}.jpg`;


    const imagesDir = new Directory(Paths.document, 'images');
    const dirInfo = await imagesDir.info();
    if (!dirInfo.exists) {
      await imagesDir.create({ intermediates: true });
    }

    // Caminho absoluto válido
    const fileUri = `${imagesDir.uri}/${filename}`;


    const sourceFile = new File(uri);
    const targetFile = new File(fileUri);
    await sourceFile.copy(targetFile);

    return {
      id: imageId,
      path: fileUri,
    };
  } catch (error) {
    console.error('Erro ao salvar imagem localmente:', error);
    throw error;
  }
};