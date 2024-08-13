from pathlib import Path

import jax
import jax.numpy as jnp
import jax.random as jr
import torchvision
from torchvision.transforms import Compose, Resize, ToTensor


def load_mnist(
    num_pixels_per_dim: int = 28,
    train: bool = True,
    num_images: int | None = None,
    num_classes: int = 10,
    seed: int = 0,
) -> tuple[jax.Array, jax.Array]:
    """Download and load the MNIST dataset. The pixel values are normalized to [0, 1].

    Args:
        num_pixels_per_dim: The number of pixels per dimension (downsampled from 28).
        train: Whether to load the training set.
        num_images: The number of images to load. If None, load all images.
        num_classes: The number of classes to consider.
        data_dir: The directory to save the dataset.
        seed: The random seed.

    Returns:
        A tuple of images and labels.
    """
    key = jr.key(seed)
    transform = Compose([Resize((num_pixels_per_dim, num_pixels_per_dim)), ToTensor()])
    mnist_data_dir = Path(Path.cwd(), "data", "mnist")
    mnist_data_dir.mkdir(exist_ok=True, parents=True)
    dataset = torchvision.datasets.MNIST(
        root=mnist_data_dir, train=train, download=True, transform=transform
    )
    # Filter the dataset
    images = []
    labels = []
    for img, target in dataset:
        if target < num_classes:
            images.append(img.numpy().squeeze())
            labels.append(target)
    # Shuffle
    idx = jr.permutation(key, len(images))
    num_images = len(images) if num_images is None else num_images
    return jnp.array(images)[idx[:num_images]], jnp.array(labels)[idx[:num_images]]
