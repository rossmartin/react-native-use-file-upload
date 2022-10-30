import React, { useRef, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Button,
  ImageBackground,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import SortableGrid, { ItemOrder } from 'react-native-sortable-grid';
import ReactNativeHapticFeedback, {
  HapticOptions,
} from 'react-native-haptic-feedback';

import ProgressBar from './components/ProgressBar';
import useFileUpload, { UploadItem } from '../../src/index';
import { allSettled } from './util/allSettled';

const hapticFeedbackOptions: HapticOptions = {
  enableVibrateFallback: false,
  ignoreAndroidSystemSettings: false,
};

interface Item extends UploadItem {
  progress?: number;
  failed?: boolean; // true on timeout or error
  completed?: boolean; // true when request is done
}

export default function App() {
  const [data, setData] = useState<Item[]>([]);
  const dragStartAnimatedValue = useRef(new Animated.Value(1));

  const { startUpload, abortUpload } = useFileUpload({
    url: 'http://localhost:8080/upload',
    field: 'file',
    // optional below
    method: 'POST',
    timeout: 60000, // you can set this lower to cause timeouts to happen
    onProgress: ({ item, event }) => {
      const progress = event?.loaded
        ? Math.floor((event.loaded / event.total) * 100)
        : 0;
      updateItem({
        item,
        keysAndValues: [{ key: 'progress', value: progress }],
      });
    },
    onDone: data => {
      console.log('onDone, data: ', data);
      updateItem({
        item: data.item,
        keysAndValues: [{ key: 'completed', value: true }],
      });
    },
    onError: data => {
      console.log('onError, data: ', data);
      updateItem({
        item: data.item,
        keysAndValues: [
          { key: 'progress', value: undefined },
          { key: 'failed', value: true },
        ],
      });
    },
    onTimeout: data => {
      console.log('onTimeout, data: ', data);
      updateItem({
        item: data.item,
        keysAndValues: [
          { key: 'progress', value: undefined },
          { key: 'failed', value: true },
        ],
      });
    },
  });

  const isUploading = useMemo(() => {
    return data.some(item => {
      return (
        typeof item.progress === 'number' &&
        item.progress > 0 &&
        item.progress < 100
      );
    });
  }, [data]);

  const updateItem = <K extends keyof Item>({
    item,
    keysAndValues,
  }: {
    item: Item;
    keysAndValues: { key: K; value: Item[K] }[];
  }) => {
    setData(prevState => {
      const newState = [...prevState];
      const itemToUpdate = newState.find(s => s.uri === item.uri);

      if (itemToUpdate) {
        keysAndValues.forEach(({ key, value }) => {
          itemToUpdate[key] = value;
        });
      }

      return newState;
    });
  };

  const onPressSelectMedia = async () => {
    const response = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 0,
      quality: 0.8,
    });

    const items: Item[] =
      response?.assets?.map(a => ({
        name: a.fileName!,
        type: a.type!,
        uri: a.uri!,
      })) ?? [];

    setData(prevState => [...prevState, ...items]);
  };

  const onPressUpload = async () => {
    // allow uploading any that previously failed
    setData(prevState =>
      [...prevState].map(item => ({
        ...item,
        failed: false,
      }))
    );

    const promises = data
      .filter(item => typeof item.progress !== 'number') // leave out any in progress
      .map(item => startUpload(item));
    // use Promise.all here if you want an error from a timeout or error
    const result = await allSettled(promises);
    console.log('result: ', result);
  };

  const onPressDeleteItem = (item: Item) => () => {
    setData(prevState => {
      const newState = [...prevState];
      const deleteIndex = prevState.findIndex(s => s.uri === item.uri);

      if (deleteIndex > -1) {
        newState.splice(deleteIndex, 1);
      }

      return newState;
    });
    abortUpload(item.uri);
  };

  const onPressRetry = (item: Item) => async () => {
    updateItem({
      item,
      keysAndValues: [
        {
          key: 'failed',
          value: false,
        },
      ],
    });
    // wrapped in try/catch here just to get rid of possible unhandled promise warning
    try {
      await startUpload(item);
    } catch (_ex) {}
  };

  const onDragStart = () => {
    ReactNativeHapticFeedback.trigger('impactMedium', hapticFeedbackOptions);
    dragStartAnimatedValue.current.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(dragStartAnimatedValue.current, {
          toValue: 1.1,
          useNativeDriver: false,
          duration: 300,
        }),
        Animated.timing(dragStartAnimatedValue.current, {
          toValue: 1,
          useNativeDriver: false,
          duration: 300,
        }),
      ])
    ).start();
  };

  const onDragRelease = (_itemOrder: ItemOrder) => {
    //console.log('onDragRelease, itemOrder: ', _itemOrder);
  };

  const getDragStartAnimation = () => {
    return {
      transform: [
        {
          scale: dragStartAnimatedValue.current.interpolate({
            inputRange: [1, 1.1],
            outputRange: [1, 1.1],
          }),
        },
      ],
    };
  };

  const renderItem = (item: Item) => {
    const itemProgress = item.progress || 0;
    const showProgress = !item.failed && itemProgress > 0 && itemProgress < 100;

    return (
      <ImageBackground
        key={item.uri}
        source={{ uri: item.uri }}
        imageStyle={styles.image}
        style={styles.imageBackground}
      >
        {showProgress ? (
          <ProgressBar value={itemProgress} style={styles.progressBar} />
        ) : null}
        {item.failed ? (
          <Pressable onPress={onPressRetry(item)}>
            <Text style={styles.refreshIconText}>&#x21bb;</Text>
          </Pressable>
        ) : null}
        {item.completed ? (
          <Text style={styles.refreshIconText}>&#10003;</Text>
        ) : null}
        <Pressable style={styles.deleteIcon} onPress={onPressDeleteItem(item)}>
          <Text style={styles.deleteIconText}>&#x2717;</Text>
        </Pressable>
      </ImageBackground>
    );
  };

  return (
    <SafeAreaView style={styles.flexContainer}>
      <View style={styles.container}>
        <Button title="Select Media" onPress={onPressSelectMedia} />

        <SortableGrid
          itemsPerRow={3}
          onDragStart={onDragStart}
          onDragRelease={onDragRelease}
          dragStartAnimation={getDragStartAnimation()}
        >
          {data.map(d => renderItem(d))}
        </SortableGrid>

        <View style={styles.flexContainer} />
        <View style={styles.row}>
          <Button title="Upload" onPress={onPressUpload} />
          {isUploading && <ActivityIndicator />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  flexContainer: {
    flex: 1,
  },
  imageBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 8,
  },
  image: {
    borderRadius: 12,
  },
  deleteIcon: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteIconText: {
    fontWeight: '800',
  },
  refreshIconText: {
    fontSize: 64,
    color: '#fff',
    fontWeight: '800',
  },
  progressBar: {
    position: 'absolute',
    bottom: 12,
    width: '80%',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
